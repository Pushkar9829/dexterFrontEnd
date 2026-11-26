import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, Lock, ShieldAlert, Sparkles, Database } from 'lucide-react'
import { cn } from '@/lib/cn'

const INTEL_TABS = [
  { to: '/operations/ai-overview', label: 'AI Overview' },
  { to: '/operations/mis', label: 'MIS & Reports' },
  { to: '/operations/masters', label: 'Master Data' },
  { to: '/operations/permissions', label: 'Permissions' },
  { to: '/operations/complaint-master', label: 'Complaint Master' },
]

export function IntelShell({ title, sub, active, actions, children }: { title: string; sub?: ReactNode; active: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <div className="flex items-center gap-1.5 text-[12px] text-muted">
        <Home size={14} className="shrink-0" />
        <Link to="/dashboard" className="hover:text-primary">Workspace</Link>
        <ChevronRight size={12} />
        <Link to="/operations" className="hover:text-primary">Operations</Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-ink">{title}</span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink">{title}</h1>
          {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav aria-label="Operations intelligence sections" className="scroll-thin overflow-x-auto rounded-xl border border-line bg-white px-4">
        <div className="flex min-w-max gap-6">
          {INTEL_TABS.map((t) => (
            <Link key={t.to} to={t.to} className={cn('border-b-2 py-3 text-[13px] font-medium', active === t.to ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink')}>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  )
}

export function Panel({ title, sub, action, children, className, kind }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; kind?: 'ai' | 'live' }) {
  return (
    <section className={cn('rounded-xl border bg-white', kind === 'ai' ? 'border-violet-200 bg-violet-50/30' : 'border-line', className)}>
      <div className="flex flex-wrap items-start gap-2 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
            {title}
            {kind && <SourceTag kind={kind} />}
          </h3>
          {sub && <p className="mt-0.5 text-[11.5px] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  )
}

/** Visual separation of AI observations from actual ERP figures (§15.2). */
export function SourceTag({ kind }: { kind: 'ai' | 'live' }) {
  return kind === 'ai' ? (
    <span className="inline-flex items-center gap-1 rounded border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-800 uppercase">
      <Sparkles size={11} /> AI observation
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 uppercase">
      <Database size={11} /> Live data
    </span>
  )
}

export function Stat({ label, value, caption, to, tone = 'navy' }: { label: string; value: ReactNode; caption?: ReactNode; to?: string; tone?: 'navy' | 'amber' | 'red' | 'green' }) {
  const color = { navy: 'text-primary', amber: 'text-amber-700', red: 'text-red-700', green: 'text-emerald-700' }[tone]
  const body = (
    <div className="h-full rounded-xl border border-line bg-white p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-ink-2">{label}</span>
        <SourceTag kind="live" />
      </div>
      <div className={cn('mt-2 text-[26px] font-semibold tabular-nums', color)}>{value}</div>
      {caption && <div className="mt-1 text-[11.5px] text-muted">{caption}</div>}
    </div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

export function AccessDenied({ what, reason }: { what: string; reason?: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 p-5">
      <Lock size={18} className="mt-0.5 shrink-0 text-red-700" />
      <div>
        <div className="text-[14px] font-semibold text-red-800">Access denied · {what}</div>
        <p className="mt-1 text-[12.5px] text-red-700">{reason ?? 'Your role / user permissions do not include this action. Ask an Admin to grant it in Operations › Permissions.'}</p>
      </div>
    </div>
  )
}

export function BackendNote({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
      <ShieldAlert size={15} className="mt-0.5 shrink-0" />
      <span>{children ?? 'Frontend gating only. The backend API must enforce the same role and user permissions on every request (§19 "Role-based authorization on backend").'}</span>
    </div>
  )
}

export const selectCls = 'h-9 rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink outline-none focus:border-primary'
export const inputCls = 'h-9 rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink outline-none placeholder:text-muted/70 focus:border-primary'

export function Table({ head, children, minWidth = 720 }: { head: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-[12px]" style={{ minWidth }}>
        <thead className="bg-surface text-[11px] font-semibold text-ink-2">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">{children}</tbody>
      </table>
    </div>
  )
}

