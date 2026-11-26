import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, Download, Home, Save, Search, Send, type LucideIcon } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { inrP, PNL_TONE, type Paise } from '@/data/payout'
import { EXPENSE_TONE } from './bmStore'

/** Operations-style page frame (Workspace › Operations › …) for the /operations BM screens. */
export function OpsPage({ title, crumbs, icon: Icon, badge, actions, children }: { title: string; crumbs: string[]; icon: LucideIcon; badge?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/dashboard" className="hover:text-[#0066FF]">Workspace</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="hover:text-[#0066FF]">Operations</Link>
        {crumbs.map((c, i) => (
          <span key={c + i} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-slate-400" />
            <span className={i === crumbs.length - 1 ? 'font-semibold text-slate-800' : ''}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0066FF] text-white shadow-sm">
            <Icon size={22} />
          </div>
          <h1 className="text-[24px] leading-tight font-bold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
          {badge}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/** Fixed-size tabs (never stretch). */
export function FixedTabs<T extends string>({ tabs, value, onChange, width = 190 }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; width?: number }) {
  return (
    <div role="tablist" className="scroll-thin flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          style={{ width }}
          className={cn(
            'flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors',
            value === t.key ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
          )}
        >
          <span className="truncate">{t.label}</span>
          {t.count != null && <span className={cn('rounded-md px-1.5 py-0.5 text-[11px]', value === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export type Opt = string | { value: string; label: string }
const optV = (o: Opt) => (typeof o === 'string' ? o : o.value)
const optL = (o: Opt) => (typeof o === 'string' ? o : o.label)

export function FilterSelect({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: Opt[]; all?: string }) {
  return (
    <label className="block min-w-[140px]">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-[12px] text-slate-800 outline-none focus:border-[#0066FF]">
          <option value="all">{all}</option>
          {options.map((o) => (
            <option key={optV(o)} value={optV(o)}>
              {optL(o)}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  )
}

export function TableBar({ search, onSearch, placeholder = 'Search…', children, onDownload, right }: { search: string; onSearch: (v: string) => void; placeholder?: string; children?: ReactNode; onDownload: () => void; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3">
      <label className="block min-w-[200px] flex-1 sm:max-w-[280px]">
        <span className="mb-1 block text-[11px] font-semibold text-slate-700">Search</span>
        <span className="relative block">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#0066FF]" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0066FF]" />
        </span>
      </label>
      {children}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {right}
        <button type="button" onClick={onDownload} className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
          <Download size={14} className="text-[#0066FF]" /> Download
        </button>
      </div>
    </div>
  )
}

export type Col<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string; footer?: ReactNode }
export function DataTable<T>({
  rows, cols, rowKey, empty = 'No records match the filters.', noun = 'records', pageSize: initial = 10, toolbar, minWidth = 760, showFooter,
}: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; empty?: string; noun?: string; pageSize?: number; toolbar?: ReactNode; minWidth?: number; showFooter?: boolean }) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initial)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const cur = Math.min(page, pages)
  const visible = useMemo(() => rows.slice((cur - 1) * size, cur * size), [rows, cur, size])
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {toolbar}
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-left text-[12px]" style={{ minWidth }}>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={cn('px-3 py-2.5 whitespace-nowrap', c.className)}>
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
                    <td key={c.key} className={cn('px-3 py-2.5 align-top text-slate-700', c.className)}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {showFooter && rows.length > 0 && (
            <tfoot className="bg-blue-50/70 text-[12px] font-bold text-slate-900">
              <tr>
                {cols.map((c) => (
                  <td key={c.key} className={cn('px-3 py-2.5 whitespace-nowrap', c.className)}>
                    {c.footer}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
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

export function FormActions({ onDraft, onSubmit, onBack, submitLabel = 'Submit', disabled, backLabel = 'Back' }: { onDraft?: () => void; onSubmit: () => void; onBack: () => void; submitLabel?: string; disabled?: boolean; backLabel?: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
      <Button variant="secondary" type="button" onClick={onBack} icon={<ArrowLeft size={14} />}>
        {backLabel}
      </Button>
      {onDraft && (
        <Button variant="secondary" type="button" onClick={onDraft} disabled={disabled} icon={<Save size={14} />}>
          Save Draft
        </Button>
      )}
      <Button type="button" onClick={onSubmit} disabled={disabled} icon={<Send size={14} />}>
        {submitLabel}
      </Button>
    </div>
  )
}

export function Panel({ title, sub, children, action, className, icon: Icon }: { title: string; sub?: ReactNode; children: ReactNode; action?: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {Icon && <Icon size={18} className="mt-0.5 text-[#0066FF]" />}
          <div>
            <h2 className="text-[15px] leading-tight font-bold text-slate-900">{title}</h2>
            {sub && <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Kpi({ label, value, icon: Icon, tone = 'blue', caption }: { label: string; value: ReactNode; icon: LucideIcon; tone?: 'blue' | 'green' | 'red' | 'amber' | 'slate'; caption?: ReactNode }) {
  const t = { blue: 'bg-blue-50 text-[#0066FF]', green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-100 text-slate-600' }[tone]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', t)}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold text-slate-600">{label}</div>
        <div className="mt-0.5 truncate text-[20px] leading-tight font-bold text-slate-900">{value}</div>
        {caption && <div className="mt-0.5 truncate text-[11px] text-slate-500">{caption}</div>}
      </div>
    </div>
  )
}

export function Note({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'amber' | 'blue' | 'red' }) {
  const t = { slate: 'border-slate-200 bg-slate-50 text-slate-600', amber: 'border-amber-200 bg-amber-50 text-amber-900', blue: 'border-blue-200 bg-blue-50 text-blue-900', red: 'border-red-200 bg-red-50 text-red-800' }[tone]
  return <div className={cn('rounded-lg border px-3.5 py-2.5 text-[12px]', t)}>{children}</div>
}

export function PickField({ label, required, value, onChange, options, error, placeholder = 'Select', disabled, hint }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; options: Opt[]; error?: string; placeholder?: string; disabled?: boolean; hint?: ReactNode }) {
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
            <option key={optV(o)} value={optV(o)}>
              {optL(o)}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute top-2.5 right-2.5 text-muted" />
      </span>
      {error ? <span className="mt-1 block text-[11px] text-brand-red">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  )
}

export const Money = ({ p, className }: { p: Paise; className?: string }) => <span className={cn('tabular-nums', p < 0 && 'text-red-600', className)}>{inrP(p)}</span>

export const PnlBadge = ({ status }: { status: string }) => <Badge tone={PNL_TONE[status] ?? 'gray'}>{status}</Badge>
export const ExpBadge = ({ status }: { status: string }) => <Badge tone={EXPENSE_TONE[status] ?? 'gray'}>{status}</Badge>

export function InfoCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-medium text-slate-900">{value}</div>
    </div>
  )
}

/** Multi-file picker (keeps name/size only). Rejects wrong types and files above maxMb. */
export function MultiFileDrop({ files, onChange, accept = '.pdf,.jpg,.jpeg,.png', maxMb = 10, onError }: { files: { name: string; size: number; file?: File }[]; onChange: (f: { name: string; size: number; file?: File }[]) => void; accept?: string; maxMb?: number; onError: (msg: string) => void }) {
  const exts = accept.split(',').map((x) => x.trim().toLowerCase())
  const take = (list: FileList | null) => {
    if (!list) return
    const ok: { name: string; size: number; file?: File }[] = []
    const bad: string[] = []
    Array.from(list).forEach((f) => {
      const ext = `.${f.name.split('.').pop()?.toLowerCase()}`
      if (!exts.includes(ext)) bad.push(`${f.name}: unsupported format`)
      else if (f.size > maxMb * 1024 * 1024) bad.push(`${f.name}: larger than ${maxMb} MB`)
      else if (files.some((x) => x.name === f.name) || ok.some((x) => x.name === f.name)) bad.push(`${f.name}: already attached`)
      else ok.push({ name: f.name, size: f.size, file: f })
    })
    if (bad.length) onError(bad.join(' · '))
    if (ok.length) onChange([...files, ...ok])
  }
  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          take(e.dataTransfer.files)
        }}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/30 px-4 py-4 text-center hover:border-[#0066FF]"
      >
        <span className="text-[12.5px] font-medium text-slate-700">
          Drag &amp; drop files here or <span className="font-semibold text-[#0066FF] underline">Browse Files</span>
        </span>
        <span className="text-[11px] text-slate-500">Supported formats: PDF, JPG, JPEG, PNG · Multiple files allowed (Max {maxMb} MB each)</span>
        <input
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            take(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px]">
              <span className="max-w-[200px] truncate">{f.name}</span>
              <span className="text-slate-400">{f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`}</span>
              <button type="button" className="text-red-500" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x.name !== f.name))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
