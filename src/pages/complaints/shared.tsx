import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, Download, Plus, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Badge, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { getLastOpened, nowMs, type Complaint, type Priority, sla, statusLabel, fmtDate, fmtTime } from '@/data/complaints'

export const BASE = '/operations/complaints'

/* ---------------------------------------------- shell ------------------------------------------- */

const TABS = [
  { label: 'Complaint 360', to: '360' },
  { label: 'Management', to: BASE },
  { label: 'Operations', to: `${BASE}/operations` },
  { label: 'Assets', to: `${BASE}/assets` },
  { label: 'AI insights', to: `${BASE}/ai` },
  { label: 'Create complaint', to: `${BASE}/new` },
]

export function SubNav() {
  const { pathname } = useLocation()
  const fixed = TABS.filter((t) => t.to !== '360').map((t) => t.to)
  const isActive = (to: string) => (to === '360' ? pathname.startsWith(`${BASE}/`) && !fixed.includes(pathname) : pathname === to)
  return (
    <nav aria-label="Complaints sections" className="scroll-thin mb-[18px] overflow-x-auto rounded-xl border border-line bg-white px-4">
      <div className="flex min-w-max gap-6">
        {TABS.map((t) => {
          const to = t.to === '360' ? `${BASE}/${getLastOpened()}` : t.to
          const active = isActive(t.to)
          return (
            <Link
              key={t.label}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'border-b-2 py-3 text-[13px] whitespace-nowrap transition-colors',
                active ? 'border-primary font-semibold text-primary' : 'border-transparent text-ink-2 hover:text-primary',
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function ComplaintsShell({
  title,
  sub,
  onExport,
  children,
  footer = true,
}: {
  title: string
  sub: string
  onExport?: () => void
  children: ReactNode
  footer?: boolean
}) {
  const nav = useNavigate()
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title={title}
        sub={sub}
        actions={
          onExport && (
            <>
            <Button variant="secondary" icon={<Download size={15} />} onClick={onExport}>
              Export
            </Button>
            <Button icon={<Plus size={15} />} onClick={() => nav(`${BASE}/new`)}>
              Create complaint
            </Button>
            </>
          )
        }
      />
      <SubNav />
      {children}
      {footer && <PageFooter />}
    </div>
  )
}

export function PageFooter() {
  return (
    <div className="mt-6 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
      <span>India operations · Illustrative data · 01–06 Oct 2026</span>
      <span>
        Last updated {fmtDate(nowMs())}, {fmtTime(nowMs())} IST
      </span>
    </div>
  )
}

/* -------------------------------------------- building blocks ----------------------------------- */

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(nowMs)
  useEffect(() => {
    const t = setInterval(() => setNow(nowMs()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function Kpi({ label, value, caption, tone }: { label: string; value: ReactNode; caption?: ReactNode; tone?: 'red' | 'amber' | 'green' }) {
  const color = tone === 'red' ? 'text-brand-red' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-700' : 'text-ink'
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white px-4 pt-4 pb-3.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cn('mt-1 text-[28px] leading-[36px] font-semibold', color)}>{value}</div>
      {caption && <div className={cn('mt-1 text-[10.5px] leading-[15px]', tone === 'red' ? 'text-brand-red' : 'text-muted')}>{caption}</div>}
    </div>
  )
}

export function Panel({
  title,
  sub,
  action,
  children,
  id,
  className,
  icon,
}: {
  title: ReactNode
  sub?: ReactNode
  action?: ReactNode
  children: ReactNode
  id?: string
  className?: string
  icon?: ReactNode
}) {
  return (
    <section id={id} className={cn('min-w-0 scroll-mt-4 rounded-xl border border-line bg-white p-4', className)}>
      <div className="panel-head mb-3 flex flex-wrap items-start gap-x-3 gap-y-1">
        {icon && <span className="mt-0.5 text-primary">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
          {sub && <p className="mt-2.5 text-[11px] text-muted">{sub}</p>}
        </div>
        {action && <div className="mt-0.5 flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
      </div>
      {children}
    </section>
  )
}

export function LinkBtn({ onClick, children, to }: { onClick?: () => void; children: ReactNode; to?: string }) {
  const cls = 'inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline'
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

export const ViewAll = ({ to, onClick, label = 'View all', arrow = true }: { to?: string; onClick?: () => void; label?: string; arrow?: boolean }) => (
  <LinkBtn to={to} onClick={onClick}>
    {label} {arrow && <ArrowRight size={13} />}
  </LinkBtn>
)

/** "Label · value" detail row (design style). */
export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="py-1 text-[12px] leading-[18px] text-ink-2">
      <span className="text-ink">{k}</span>
      <span className="mx-1.5 text-muted">·</span>
      <span>{children}</span>
    </div>
  )
}

export function BarRow({ label, value, max, color = 'bg-primary', suffix }: { label: string; value: number; max: number; color?: string; suffix?: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex justify-between gap-2 text-[11px] leading-[16px] text-ink">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-medium">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-[7px] rounded-full bg-line-soft">
        <div className={cn('h-[7px] rounded-full', color)} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  )
}

export const priorityTone = (p: Priority): Tone => (p === 'Critical' ? 'red' : p === 'High' ? 'amber' : p === 'Medium' ? 'blue' : 'gray')
export const PriorityBadge = ({ p }: { p: Priority }) => <Badge tone={priorityTone(p)}>{p}</Badge>
export const StatusBadge = ({ c }: { c: Complaint }) => {
  const s = statusLabel(c)
  return <Badge tone={s === 'Closed' ? 'green' : s === 'Pending' ? 'amber' : 'blue'}>{s}</Badge>
}
export function SlaText({ c, now }: { c: Complaint; now: number }) {
  const s = sla(c, now)
  return <span className={cn(s.tone === 'red' && 'font-medium text-brand-red', s.tone === 'amber' && 'font-medium text-amber-700', s.tone === 'green' && 'text-emerald-700')}>{s.label}</span>
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 rounded-full border px-3 text-[12px] whitespace-nowrap transition-colors',
        active ? 'border-primary bg-primary font-semibold text-white' : 'border-line bg-white text-ink-2 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  )
}

/** Button-styled dropdown with a custom panel. */
export function Dropdown({ label, children, width = 260 }: { label: ReactNode; children: (close: () => void) => ReactNode; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-[38px] items-center gap-2 rounded-lg border border-line bg-white px-4 text-[12px] font-semibold text-ink hover:border-primary/40"
      >
        {label}
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="absolute top-11 left-0 z-30 max-w-[calc(100vw-32px)] rounded-lg border border-line bg-white p-2 shadow-lg" style={{ width }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MultiCheck({ options, value, onChange, allLabel }: { options: string[]; value: string[]; onChange: (v: string[]) => void; allLabel: string }) {
  return (
    <div className="max-h-72 overflow-y-auto">
      <label className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] font-medium hover:bg-surface">
        <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
        {allLabel}
      </label>
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-surface">
          <input type="checkbox" checked={value.includes(o)} onChange={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])} />
          {o}
        </label>
      ))}
    </div>
  )
}

/** Simple timeline list item used in Complaint 360 / dashboards. */
export function Entry({ title, status, meta, tone, action }: { title: ReactNode; status?: string; meta?: ReactNode; tone?: Tone; action?: ReactNode }) {
  return (
    <div className="group py-[10px] [.panel-head+&]:pt-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-ink">
        <span className="min-w-0">{title}</span>
        {status && (
          <>
            <span className="text-muted">·</span>
            <span data-tone={tone ?? 'gray'}>{status}</span>
          </>
        )}
        {action && <span className="ml-auto transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">{action}</span>}
      </div>
      {meta && <div className="text-[12px] leading-5 text-ink-2">{meta}</div>}
    </div>
  )
}

export function Banner({ tone = 'red', lead, children, action }: { tone?: 'red' | 'amber' | 'blue'; lead: ReactNode; children: ReactNode; action?: ReactNode }) {
  const box = tone === 'red' ? 'border-red-200 bg-red-50' : tone === 'amber' ? 'border-amber-100 bg-[#fdf4e3]' : 'border-transparent bg-primary-soft'
  const leadCls = tone === 'red' ? 'text-brand-red' : tone === 'amber' ? 'text-amber-700' : 'text-primary'
  return (
    <div className={cn('mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border px-5 py-3.5 text-[12px]', box)}>
      <span className={cn('font-medium', leadCls)}>{lead}</span>
      <span className="min-w-0 flex-1 text-ink-2">{children}</span>
      {action}
    </div>
  )
}

/** Design "grid card": icon + title + sub, export icon and View all on the right, grid, "Showing N … records" footer. */
export function GridCard({
  id,
  title,
  sub,
  onExport,
  viewAll,
  footer,
  children,
  className,
}: {
  id?: string
  title: ReactNode
  sub?: ReactNode
  onExport?: () => void
  viewAll?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('mb-5 scroll-mt-4 overflow-hidden rounded-xl border border-line bg-white', className)}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <Table2 size={18} className="text-primary" />
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
        <div className="ml-auto flex items-center gap-4">
          {onExport && (
            <button type="button" aria-label={`Export ${typeof title === 'string' ? title.toLowerCase() : 'records'}`} onClick={onExport} className="text-muted hover:text-primary">
              <Download size={16} />
            </button>
          )}
          {viewAll}
        </div>
      </div>
      {children}
      {footer && <div className="border-t border-line-soft px-4 py-3.5 text-[11px] text-muted">{footer}</div>}
    </section>
  )
}

export const CHART = { navy: '#1e3f95', green: '#17855a', amber: '#f5a524', red: '#e52429', grid: '#e8edf5', muted: '#667085' }
