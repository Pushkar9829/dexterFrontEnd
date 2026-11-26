import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Download, Eye, Filter, Pencil, RotateCw, Search, Table2, Trash2 } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import { usePlans, VERTICALS, type PayoutPlan } from '@/data/payout'
import { activeVersionOf, deletePlanVersion, latestByCode, PLAN_STATUSES, planKey, planTotal, rs, versionsOf } from './model'

export const thCls = 'border-r border-white/15 px-2.5 py-2 text-center text-[11px] font-semibold whitespace-nowrap last:border-r-0'
export const tdCls = 'border-r border-line-soft px-2.5 py-1.5 text-center text-[11.5px] last:border-r-0'
export const theadCls = 'bg-[#14213e] text-white'
export const inputCls = 'h-8 w-full rounded-md border bg-white px-2 text-[12px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-surface disabled:text-muted'

/** Light-blue section bar used across the Plan Mapping designs. */
export function SectionBar({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#eaf1ff] px-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#0066FF] text-white">{icon}</span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-[#0b2a6b]">{title}</h3>
        {sub && <p className="text-[11px] text-muted">{sub}</p>}
      </div>
      {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

/** Fixed-size 4-step stepper (each step keeps the same width / height). */
export function Stepper({ labels, step, reachable, onStep }: { labels: string[]; step: number; reachable: (i: number) => boolean; onStep: (i: number) => void }) {
  return (
    <nav className="scroll-thin overflow-x-auto rounded-xl border border-line bg-white p-1.5" aria-label="Plan steps">
      <ol className="flex min-w-max items-center gap-1">
        {labels.map((l, i) => {
          const active = i === step
          const done = i < step
          const ok = reachable(i)
          return (
            <li key={l} className="flex items-center gap-1">
              <button
                type="button"
                disabled={!ok}
                onClick={() => onStep(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-11 w-[272px] items-center justify-center gap-2.5 rounded-lg px-3 text-[12.5px] font-semibold transition-colors',
                  active ? 'bg-[#0066FF] text-white' : 'text-ink hover:bg-surface',
                  !ok && 'cursor-not-allowed opacity-60',
                )}
              >
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px]', active ? 'border-white bg-white text-[#0066FF]' : done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-ink text-ink')}>
                  {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="truncate">{l}</span>
              </button>
              {i < labels.length - 1 && <ChevronRight size={18} className="shrink-0 text-[#0066FF]" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Number input that keeps the typed text while focused (so "0." or "" can be typed) and reports parsed numbers. */
export function NumInput({ value, onChange, allowEmpty, integer, placeholder, error, disabled, className, ariaLabel }: {
  value: number | null; onChange: (n: number | null) => void; allowEmpty?: boolean; integer?: boolean; placeholder?: string; error?: boolean; disabled?: boolean; className?: string; ariaLabel?: string
}) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? (value === null ? '' : String(value))
  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={ariaLabel}
      value={shown}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setText(value === null ? '' : String(value))}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const t = e.target.value.replace(integer ? /[^\d]/g : /[^\d.]/g, '')
        setText(t)
        if (t === '') onChange(allowEmpty ? null : 0)
        else if (!Number.isNaN(Number(t))) onChange(integer ? Math.trunc(Number(t)) : Number(t))
      }}
      className={cn(inputCls, 'text-right', error ? 'border-brand-red' : 'border-line', className)}
    />
  )
}

/** Rupee amount input that stores integer paise; shows Indian grouping when not focused. */
export function MoneyInput({ value, onChange, error, disabled, id, ariaLabel, className }: { value: number; onChange: (paise: number) => void; error?: boolean; disabled?: boolean; id?: string; ariaLabel?: string; className?: string }) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? (value ? rs(value, 0) : '')
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={shown}
      placeholder="0"
      disabled={disabled}
      onFocus={() => setText(value ? String(value / 100) : '')}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.]/g, '')
        setText(t)
        const n = Number(t || 0)
        if (!Number.isNaN(n)) onChange(Math.round(n * 100))
      }}
      className={cn(inputCls, 'h-9 text-right text-[13px]', error ? 'border-brand-red' : 'border-line', className)}
    />
  )
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[11px] text-brand-red">{msg}</p> : null
}

export function IssueList({ items, title = 'Fix these before continuing' }: { items: string[]; title?: string }) {
  if (!items.length) return null
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700" role="alert">
      <div className="font-semibold">{title}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((m, i) => <li key={`${i}-${m}`}>{m}</li>)}
      </ul>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'Draft' ? 'purple' : toneFor(status)}>{status}</Badge>
}

/** Plan List card — shown on the list route and under every wizard step, as in the designs. */
export function PlanListCard({ highlight }: { highlight?: string }) {
  const navigate = useNavigate()
  const plans = usePlans()
  const [q, setQ] = useState('')
  const [vertical, setVertical] = useState('')
  const [status, setStatus] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [toDelete, setToDelete] = useState<PayoutPlan | null>(null)

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return latestByCode(plans)
      .filter((p) => (!vertical || p.vertical === vertical) && (!status || p.status === status) && (!k || `${p.name} ${p.code}`.toLowerCase().includes(k)))
      .sort((a, b) => b.code.localeCompare(a.code))
  }, [plans, q, vertical, status])
  const pageRows = rows.slice((page - 1) * size, page * size)

  const exportCsv = () => {
    if (!rows.length) return toast('No plans to export', 'info')
    downloadCsv(`plan-list-${new Date().toISOString().slice(0, 10)}`, ['S.N.', 'Plan Name', 'Plan Code', 'Version', 'Business Vertical', 'Site Category', 'Plan Type', 'Model Type', 'Total Investment (INR)', 'Status'],
      rows.map((p, i) => [String(i + 1), p.name, p.code, `v${p.version}`, p.vertical, p.siteCategory, p.planType, p.modelType, (planTotal(p) / 100).toFixed(2), p.status]))
    toast(`${rows.length} plan(s) exported`)
  }
  const editTitle = (p: PayoutPlan) =>
    p.status === 'Pending Approval' ? 'Awaiting approval — the checker must reject it before it can be edited' : p.status === 'Draft' ? 'Edit draft' : `Edit creates version ${Math.max(...versionsOf(plans, p.code).map((x) => x.version)) + 1}; v${p.version} is preserved`

  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-3">
      <SectionBar
        icon={<Table2 size={16} />}
        title="Plan List"
        action={
          <>
            <label className="relative">
              <Search size={14} className="pointer-events-none absolute top-2.5 left-2.5 text-muted" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search Plan Name / Code..." aria-label="Search plans" className={cn(inputCls, 'h-9 w-[240px] border-line pl-8')} />
            </label>
            <select value={vertical} onChange={(e) => { setVertical(e.target.value); setPage(1) }} aria-label="Business vertical" className={cn(inputCls, 'h-9 w-[190px] border-line')}>
              <option value="">All Business Vertical</option>
              {VERTICALS.map((v) => <option key={v}>{v}</option>)}
            </select>
            <Button variant="secondary" size="md" icon={<Filter size={14} />} onClick={() => setShowFilter((s) => !s)} aria-expanded={showFilter}>Filter</Button>
            <Button variant="secondary" size="md" icon={<Download size={14} />} onClick={exportCsv}>Download</Button>
            <button type="button" onClick={() => { setQ(''); setVertical(''); setStatus(''); setPage(1) }} className="grid h-9 w-9 place-items-center rounded-md border border-[#0066FF] text-[#0066FF] hover:bg-primary-soft" aria-label="Reset filters" title="Reset filters">
              <RotateCw size={15} />
            </button>
          </>
        }
      />
      {showFilter && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-[12px]">
          <span className="font-semibold text-ink">Status:</span>
          {['', ...PLAN_STATUSES].map((s) => (
            <button key={s || 'all'} type="button" onClick={() => { setStatus(s); setPage(1) }} className={cn('h-8 w-[130px] rounded-md border text-[12px] font-semibold', status === s ? 'border-[#0066FF] bg-[#0066FF] text-white' : 'border-line bg-white text-ink-2')}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[1150px] border-collapse">
          <thead>
            <tr className={theadCls}>
              {['S.N.', 'Plan Name', 'Plan Code', 'Business Vertical', 'Site Category', 'Plan Type', 'Model Type', 'Total Investment (₹)', 'Status', 'Version', 'Action'].map((h) => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p, i) => (
              <tr key={planKey(p)} className={cn('border-t border-line-soft', highlight === p.code && 'bg-[#f3f7ff]')}>
                <td className={tdCls}>{(page - 1) * size + i + 1}</td>
                <td className={cn(tdCls, 'text-left font-medium')}>{p.name || <span className="text-muted">Untitled draft</span>}</td>
                <td className={tdCls}>{p.code}</td>
                <td className={tdCls}>{p.vertical}</td>
                <td className={tdCls}>{p.siteCategory || '—'}</td>
                <td className={tdCls}>{p.planType}</td>
                <td className={tdCls}>{p.modelType}</td>
                <td className={cn(tdCls, 'text-right tabular-nums')}>{rs(planTotal(p))}</td>
                <td className={tdCls}>
                  <StatusBadge status={p.status} />
                  {p.status !== 'Active' && activeVersionOf(plans, p.code) && <div className="mt-0.5 text-[10.5px] text-emerald-700">v{activeVersionOf(plans, p.code)?.version} Active</div>}
                </td>
                <td className={tdCls}>v{p.version}</td>
                <td className={tdCls}>
                  <div className="flex items-center justify-center gap-2">
                    <Link to={`/finance/payouts/plans/${p.code}?v=${p.version}`} className="text-[#0066FF] hover:opacity-75" aria-label={`View ${p.code}`} title="View"><Eye size={16} /></Link>
                    <button type="button" disabled={p.status === 'Pending Approval'} onClick={() => navigate(`/finance/payouts/plans/${p.code}/edit`)} className="text-[#0066FF] hover:opacity-75 disabled:cursor-not-allowed disabled:text-muted/50" aria-label={`Edit ${p.code}`} title={editTitle(p)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" disabled={p.status !== 'Draft'} onClick={() => setToDelete(p)} className="text-brand-red hover:opacity-75 disabled:cursor-not-allowed disabled:text-muted/50" aria-label={`Delete ${p.code}`} title={p.status === 'Draft' ? 'Delete draft' : 'Only Draft plans can be deleted'}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-[12px] text-muted">No plans match the search / filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1) }} noun="plans" />
      {toDelete && (
        <Modal
          title="Delete draft plan?"
          sub={`${toDelete.code} v${toDelete.version} — ${toDelete.name || 'Untitled draft'}`}
          onClose={() => setToDelete(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { deletePlanVersion(toDelete); toast(`Draft ${toDelete.code} v${toDelete.version} deleted`); setToDelete(null) }}>Delete draft</Button>
            </>
          }
        >
          <p className="text-[13px] text-ink-2">
            Only this draft version is removed.{toDelete.version > 1 ? ` Earlier versions of ${toDelete.code} stay on record.` : ''} This cannot be undone.
          </p>
        </Modal>
      )}
    </section>
  )
}
