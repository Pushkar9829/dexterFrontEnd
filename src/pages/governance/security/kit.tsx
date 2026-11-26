// Shared UI pieces for the security-administration and DPDP privacy pages
// (same look as GovernanceView: back link, icon header, stat pills, search bar, table).
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Filter, Search, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { inDateRange } from './util'

export function PageShell({
  back = '/governance',
  backLabel = 'Back to Governance',
  Icon,
  color = 'text-emerald-600 bg-emerald-50 border-emerald-200',
  title,
  sub,
  actions,
  children,
}: {
  back?: string
  backLabel?: string
  Icon: LucideIcon
  color?: string
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="max-w-[1120px] pb-12">
      <Link to={back} className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0066FF] hover:underline">
        <ArrowLeft size={15} /> {backLabel}
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg border', color)}>
              <Icon size={19} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[28px]">{title}</h1>
          </div>
          {sub && <p className="mt-1 text-[13px] text-[#64748B]">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

/** Equal-width tabs (spec UI rule: all tabs the same size). */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="grid gap-1 rounded-lg border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'h-9 truncate rounded-md px-2 text-[12.5px] transition-colors',
            value === t.value ? 'bg-white font-semibold text-primary shadow-[0_2px_8px_-2px_rgba(16,24,40,0.18)]' : 'text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-[11px] font-normal text-muted">({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
}

const statTone = { ink: 'text-ink', green: 'text-emerald-600', amber: 'text-amber-600', red: 'text-rose-600', blue: 'text-blue-600', purple: 'text-purple-600' }
export function Stat({ label, value, tone = 'ink' }: { label: string; value: ReactNode; tone?: keyof typeof statTone }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
      <div className={cn('text-[11px] font-medium tracking-wider uppercase', tone === 'ink' ? 'text-muted' : statTone[tone])}>{label}</div>
      <div className={cn('mt-1 text-2xl font-bold', statTone[tone])}>{value}</div>
    </div>
  )
}

export function Section({ title, sub, aside, children, className }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
          {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
        </div>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function DecisionBadge() {
  return <span className="ml-1.5 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">Needs management decision</span>
}

export function Note({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'amber' | 'red' }) {
  const c = tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'
  return <div className={cn('rounded-lg border px-3.5 py-2.5 text-[12px]', c)}>{children}</div>
}

/** Save Draft / Submit / Back row used by every form. */
export function FormActions({ onDraft, onSubmit, onBack, submitLabel = 'Submit', extra }: { onDraft?: () => void; onSubmit: () => void; onBack: () => void; submitLabel?: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      {extra}
      <Button variant="secondary" type="button" onClick={onBack}>
        Back
      </Button>
      {onDraft && (
        <Button variant="secondary" type="button" onClick={onDraft}>
          Save Draft
        </Button>
      )}
      <Button type="button" onClick={onSubmit}>
        {submitLabel}
      </Button>
    </div>
  )
}

/** Confirmation dialog. Optional typed word (e.g. RESTORE) and/or a mandatory reason. */
export function ConfirmModal({
  title,
  sub,
  confirmLabel = 'Confirm',
  danger,
  requireText,
  reasonLabel,
  children,
  onConfirm,
  onClose,
}: {
  title: string
  sub?: string
  confirmLabel?: string
  danger?: boolean
  requireText?: string
  reasonLabel?: string
  children?: ReactNode
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<{ typed?: string; reason?: string }>({})
  const submit = () => {
    const e: typeof err = {}
    if (requireText && typed.trim() !== requireText) e.typed = `Type ${requireText} exactly to continue.`
    if (reasonLabel && !reason.trim()) e.reason = `${reasonLabel} is required.`
    setErr(e)
    if (Object.keys(e).length) return
    onConfirm(reason.trim())
  }
  return (
    <Modal
      title={title}
      sub={sub}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-[13px] text-ink">
        {children}
        {reasonLabel && (
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-ink">
              {reasonLabel} <span>*</span>
            </label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={cn('w-full rounded-md border px-[11px] py-2 text-[12.5px] outline-none focus:border-primary', err.reason ? 'border-brand-red' : 'border-line')} />
            {err.reason && <p className="mt-1 text-[11px] text-brand-red">{err.reason}</p>}
          </div>
        )}
        {requireText && (
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-ink">
              Type <span className="font-mono">{requireText}</span> to confirm <span>*</span>
            </label>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={cn('h-9 w-full rounded-md border px-[11px] font-mono text-[12.5px] outline-none focus:border-primary', err.typed ? 'border-brand-red' : 'border-line')} />
            {err.typed && <p className="mt-1 text-[11px] text-brand-red">{err.typed}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Data grid: Search + Filter + Download on every table (spec UI rule) ──
export type Col<T> = { key: string; label: string; value: (r: T) => string; render?: (r: T) => ReactNode; className?: string }
export type FilterDef<T> = { key: string; label: string; get: (r: T) => string; options?: string[] }

const ctl = 'h-9 rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#0066FF]'

export function DataGrid<T>({
  rows,
  cols,
  rowKey,
  filters = [],
  date,
  fileName,
  searchPlaceholder = 'Search…',
  actions,
  actionsLabel = 'Action',
  empty = 'No records match the current search / filters.',
  toolbarExtra,
  pageSize: initialPageSize = 10,
}: {
  rows: T[]
  cols: Col<T>[]
  rowKey: (r: T) => string
  filters?: FilterDef<T>[]
  date?: (r: T) => string | undefined
  fileName: string
  searchPlaceholder?: string
  actions?: (r: T) => ReactNode
  actionsLabel?: string
  empty?: string
  toolbarExtra?: ReactNode
  pageSize?: number
}) {
  const [q, setQ] = useState('')
  const [fv, setFv] = useState<Record<string, string>>({})
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const options = useMemo(
    () => Object.fromEntries(filters.map((f) => [f.key, f.options ?? [...new Set(rows.map(f.get).filter(Boolean))].sort()])),
    [filters, rows],
  )
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (s && !cols.some((c) => c.value(r).toLowerCase().includes(s))) return false
      for (const f of filters) if (fv[f.key] && f.get(r) !== fv[f.key]) return false
      if (date && !inDateRange(date(r), from, to)) return false
      return true
    })
  }, [rows, cols, filters, fv, q, date, from, to])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages)
  const visible = filtered.slice((cur - 1) * pageSize, cur * pageSize)
  const active = q || from || to || Object.values(fv).some(Boolean)

  const download = () => {
    downloadCsv(
      fileName,
      cols.map((c) => c.label),
      filtered.map((r) => cols.map((c) => c.value(r))),
    )
    toast(`Downloaded ${filtered.length} record${filtered.length === 1 ? '' : 's'}`)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Search"
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors focus:border-[#0066FF] focus:bg-white"
          />
        </div>
        {(filters.length > 0 || date) && <Filter size={15} className="text-muted" aria-hidden />}
        {filters.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={fv[f.key] ?? ''}
            onChange={(e) => {
              setFv((p) => ({ ...p, [f.key]: e.target.value }))
              setPage(1)
            }}
            className={ctl}
          >
            <option value="">All {f.label}</option>
            {options[f.key].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ))}
        {date && (
          <>
            <input type="date" aria-label="From date" value={from} onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
              }} className={ctl} />
            <input type="date" aria-label="To date" value={to} onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
              }} className={ctl} />
          </>
        )}
        {active && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setFv({})
              setFrom('')
              setTo('')
              setPage(1)
            }}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Clear
          </button>
        )}
        {toolbarExtra}
        <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={download} className="ml-auto h-9">
          Download
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-line bg-surface text-[11px] font-semibold tracking-wider text-muted uppercase">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="px-4 py-3 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">{actionsLabel}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visible.map((r) => (
              <tr key={rowKey(r)} className="align-top transition-colors hover:bg-surface/50">
                {cols.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.className)}>
                    {c.render ? c.render(r) : c.value(r) || '—'}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">{actions(r)}</div>
                  </td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={cols.length + (actions ? 1 : 0)} className="py-8 text-center text-muted">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > pageSize && (
        <div className="border-t border-line">
          <Pagination page={cur} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => {
              setPageSize(n)
              setPage(1)
            }} />
        </div>
      )}
    </div>
  )
}

/** API mode: loading / error line for pages hydrated from the backend. */
export function ApiStatus({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry?: () => void }) {
  if (loading) return <div className="mb-2 text-[12px] text-muted">Loading from the server…</div>
  if (error)
    return (
      <Note tone="red">
        Could not load all data from the server: {error}{' '}
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Retry
          </button>
        )}
      </Note>
    )
  return null
}
