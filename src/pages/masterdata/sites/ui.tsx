import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Home } from 'lucide-react'
import { Badge, toneFor } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
      <Home size={14} className="shrink-0 text-slate-400" />
      <Link to="/dashboard" className="transition-colors hover:text-[#0066FF]">
        Workspace
      </Link>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-400" />
          {it.to ? (
            <Link to={it.to} className="transition-colors hover:text-[#0066FF]">
              {it.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800">{it.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

/** §10: data fills in as onboarding progresses — empty core fields read "Pending". */
export function Pending() {
  return <span className="text-[11px] font-medium text-amber-600">Pending</span>
}
export function Val({ v }: { v?: string | number | null }) {
  return v === undefined || v === null || v === '' ? <Pending /> : <>{v}</>
}
export function StatusBadge({ s }: { s?: string }) {
  return s ? <Badge tone={toneFor(s)}>{s}</Badge> : <Pending />
}

export function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full min-w-[60px] overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-[#0066FF]' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-slate-700">{pct}%</span>
    </div>
  )
}

const ctl = 'w-full h-8.5 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]'

export function FText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={ctl} />
    </label>
  )
}

export function FSelect({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; all?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(ctl, 'appearance-none pr-7')}>
          <option value="">{all}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  )
}

/** Read-only label/value pair used across profile tabs. */
export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-slate-500">{k}</div>
      <div className="mt-0.5 truncate text-[12.5px] font-medium text-slate-900">{children}</div>
    </div>
  )
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function SimpleTable({ head, rows, empty = 'No records yet.' }: { head: string[]; rows: { key: string; cells: ReactNode[] }[]; empty?: string }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-[11.5px] text-slate-700">
        <thead>
          <tr className="border-b border-slate-200 bg-[#EEF4FC] text-left font-bold text-slate-800">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-6 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100">
                {r.cells.map((c, i) => (
                  <td key={i} className="px-3 py-2 whitespace-nowrap">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
