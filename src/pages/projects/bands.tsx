// Shared building blocks for the Projects module (Site Master + Site Installation).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Check, CircleDashed, Lock, Loader2 } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { Lifecycle, PendingItem } from '@/data/projects'
import { STAGES, stageState, type InstallRecord, type InstallStatus, type StageState } from '@/data/siteInstallation'

// ── badges ───────────────────────────────────────────────────────────────
const LC_TONE: Record<Lifecycle, Tone> = { Pipeline: 'gray', Active: 'blue', Incomplete: 'amber', Completed: 'green', Closed: 'purple', Archived: 'gray' }
export const LifecycleBadge = ({ l }: { l: Lifecycle }) => <Badge tone={LC_TONE[l]}>{l}</Badge>

const IS_TONE: Record<InstallStatus, Tone> = { 'In Progress': 'blue', 'Submitted by Franchise': 'navy', 'Correction Requested': 'amber', 'Pending Admin Approval': 'purple', 'Rejected by Admin': 'red', Approved: 'green', Reopened: 'amber' }
export const InstallBadge = ({ s }: { s: InstallStatus }) => <Badge tone={IS_TONE[s]}>{s}</Badge>

export function PendingChips({ items, linked = false, max = 3 }: { items: PendingItem[]; linked?: boolean; max?: number }) {
  if (!items.length) return <span className="text-[11px] text-muted">—</span>
  const shown = items.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((x) =>
        linked ? (
          <Link key={x.cat} to={x.to} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-amber-800 hover:underline">
            {x.cat}
          </Link>
        ) : (
          <span key={x.cat} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-amber-800">
            {x.cat}
          </span>
        ),
      )}
      {items.length > max && <span className="text-[10.5px] text-muted">+{items.length - max}</span>}
    </div>
  )
}

export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full min-w-[56px] overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-bright' : 'bg-amber-500')} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-ink-2">{pct}%</span>
    </div>
  )
}

// ── stage stepper (6 stages, shared CRM) ─────────────────────────────────
const ST_ICON: Record<StageState, ReactNode> = {
  Complete: <Check size={13} />,
  'In Progress': <Loader2 size={13} />,
  Correction: <AlertTriangle size={13} />,
  'Not Started': <CircleDashed size={13} />,
}
const ST_CLS: Record<StageState, string> = {
  Complete: 'bg-emerald-500 text-white',
  'In Progress': 'bg-bright text-white',
  Correction: 'bg-amber-500 text-white',
  'Not Started': 'bg-slate-200 text-slate-500',
}
export function StageStepper({ r, active, onPick }: { r: InstallRecord; active?: string; onPick?: (k: (typeof STAGES)[number]['key']) => void }) {
  return (
    <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1" role="tablist">
      {STAGES.map((s) => {
        const st = stageState(r, s.key)
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={active === s.key}
            onClick={() => onPick?.(s.key)}
            className={cn('flex min-w-[150px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors', active === s.key ? 'border-primary bg-primary-soft' : 'border-line bg-white hover:border-primary/40')}
          >
            <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', ST_CLS[st])}>{s.key === 'final' && r.locked ? <Lock size={12} /> : ST_ICON[st]}</span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold text-muted">Stage {s.n}</span>
              <span className="block truncate text-[12px] font-semibold text-ink">{s.label}</span>
              <span className="block text-[10px] text-muted">{st}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── chart wrappers (every chart drills down — §9) ─────────────────────────
export function ChartCard({ title, sub, children, className }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white p-4', className)}>
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
      <div className="mt-3 h-[220px]">{children}</div>
    </section>
  )
}

export function Donut({ data, onPick }: { data: { name: string; value: number; color: string }[]; onPick?: (name: string) => void }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={1} onClick={(d) => onPick?.(String((d as { name?: string }).name ?? ''))} cursor={onPick ? 'pointer' : undefined}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`, '']} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  )
}

type Series = { key: string; label: string; color: string; stack?: string }
export function Bars({ data, series, xKey = 'name', horizontal, onPick }: { data: Record<string, string | number>[]; series: Series[]; xKey?: string; horizontal?: boolean; onPick?: (name: string, series: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 8 : -18, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 10 }} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 50 : 24} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          </>
        )}
        <Tooltip />
        {series.length > 1 && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={s.stack} radius={s.stack ? 0 : 3} cursor={onPick ? 'pointer' : undefined} onClick={(d) => onPick?.(String((d as unknown as { payload?: Record<string, unknown> }).payload?.[xKey] ?? ''), s.key)} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Trend({ data, onPick }: { data: { name: string; value: number; key: string }[]; onPick?: (key: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ left: -18, right: 8, top: 4 }}
        onClick={(e) => {
          const idx = (e as unknown as { activeTooltipIndex?: number | string } | null)?.activeTooltipIndex
          const i = typeof idx === 'string' ? Number(idx) : idx
          if (i !== undefined && i !== null && data[i]) onPick?.(data[i].key)
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="value" name="Completed sites" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, cursor: 'pointer' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}


// ── filters ──────────────────────────────────────────────────────────────
const ctl = 'h-[34px] w-full rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink outline-none focus:border-primary'
export function FilterText({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10.5px] font-semibold text-ink-2">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={ctl} />
    </label>
  )
}
export function FilterSelect({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; all?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10.5px] font-semibold text-ink-2">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={ctl}>
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

export function KV({ k, children, className }: { k: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10.5px] font-semibold tracking-wide text-muted uppercase">{k}</div>
      <div className="mt-0.5 text-[12.5px] break-words text-ink">{children || <span className="text-muted">—</span>}</div>
    </div>
  )
}

export function Section({ title, sub, action, children, className }: { title: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line-soft px-4 py-3">
        <div>
          <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>
          {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function StatTile({ label, value, sub, tone = 'text-ink', active, onClick }: { label: string; value: ReactNode; sub?: string; tone?: string; active?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <div className="text-[11px] font-semibold text-muted">{label}</div>
      <div className={cn('mt-1 text-[24px] leading-none font-semibold', tone)}>{value}</div>
      {sub && <div className="mt-1.5 truncate text-[10.5px] text-muted">{sub}</div>}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={cn('rounded-xl border bg-white p-3.5 text-left transition-colors hover:border-primary/50', active ? 'border-primary ring-2 ring-primary/15' : 'border-line')}>
      {body}
    </button>
  ) : (
    <div className="rounded-xl border border-line bg-white p-3.5">{body}</div>
  )
}
