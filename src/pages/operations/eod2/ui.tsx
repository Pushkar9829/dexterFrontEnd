// Shared building blocks for the EOD / WLA / TDS / Transaction Data web screens.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Lock, Search, ShieldCheck } from 'lucide-react'
import { Badge, toneFor, type Tone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { ACK_TEXT, ACK_VERSION } from '@/data/workflow'
import { useRole } from '@/lib/rbac'
import { personaOf, ROLE_TABLE, type OpsModule } from './access'

export const TH = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap'
export const TD = 'px-3 py-2.5 text-[12px] text-slate-700 whitespace-nowrap align-top'
export const TR = 'border-t border-slate-100 hover:bg-blue-50/30'

export function OpsPage({ title, sub, back, actions, children }: { title: ReactNode; sub?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="max-w-[1280px] space-y-4">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-primary">
          <ArrowLeft size={14} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">{title}</h1>
          {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Panel({ title, sub, action, children, className, pad = true }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white shadow-xs', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <h3 className="text-[14px] font-semibold text-ink">{title}</h3>}
            {sub && <p className="text-[11.5px] text-muted">{sub}</p>}
          </div>
          {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

export function TableWrap({ children, empty }: { children: ReactNode; empty?: boolean }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
      {empty && <div className="px-4 py-10 text-center text-[12px] text-muted">No records match the filters.</div>}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-primary" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-line bg-white pr-3 pl-8 text-[12px] outline-none focus:border-primary" />
    </div>
  )
}

export function Sel({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; all?: string | null }) {
  return (
    <label className="flex min-w-[140px] flex-col gap-1">
      <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2.5 text-[12px] outline-none focus:border-primary">
        {all != null && <option value="">{all}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Status({ text, tone }: { text: string; tone?: Tone }) {
  return <Badge tone={tone ?? toneFor(text)}>{text}</Badge>
}

export function Kpi({ label, value, hint, tone = 'navy', onClick, active }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; onClick?: () => void; active?: boolean }) {
  const ring: Record<Tone, string> = { green: 'text-emerald-700', blue: 'text-blue-700', amber: 'text-amber-600', red: 'text-red-600', purple: 'text-violet-700', gray: 'text-slate-600', navy: 'text-primary' }
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={cn('rounded-xl border bg-white p-3.5 text-left shadow-xs transition-colors disabled:cursor-default', active ? 'border-primary ring-2 ring-primary/15' : 'border-line', onClick && 'hover:border-primary/50')}>
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className={cn('mt-1 text-[22px] leading-tight font-bold', ring[tone])}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </button>
  )
}

export function KV({ items, cols = 3 }: { items: [string, ReactNode][]; cols?: 2 | 3 | 4 }) {
  return (
    <dl className={cn('grid gap-x-5 gap-y-3 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3', cols === 4 && 'lg:grid-cols-4')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[10.5px] font-semibold tracking-wide text-slate-500 uppercase">{k}</dt>
          <dd className="mt-0.5 text-[12.5px] break-words text-ink">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Horizontal workflow tracker. `current` is the index of the active step; `failedAt` marks a red step. */
export function Stepper({ steps, current, failedAt }: { steps: string[]; current: number; failedAt?: number }) {
  return (
    <ol className="scroll-thin flex gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        const failed = failedAt === i
        return (
          <li key={s} className="flex min-w-[112px] flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || active ? 'bg-primary' : 'bg-slate-200')} />
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold', failed ? 'border-red-500 bg-red-50 text-red-600' : done ? 'border-primary bg-primary text-white' : active ? 'border-primary bg-white text-primary' : 'border-slate-200 bg-white text-slate-400')}>
                {done && !failed ? <Check size={14} /> : i + 1}
              </span>
              <span className={cn('h-0.5 flex-1', i === steps.length - 1 ? 'bg-transparent' : done ? 'bg-primary' : 'bg-slate-200')} />
            </div>
            <span className={cn('text-[10.5px] leading-tight', active ? 'font-semibold text-ink' : failed ? 'font-semibold text-red-600' : 'text-muted')}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Bilingual acknowledgement (Operations §2.2) — versioned text, user picks the language they read it in. */
export function AckBox({ lang, onLang, checked, onChecked, error, title = 'Acknowledgement / स्वीकृति' }: { lang: 'Hindi' | 'English'; onLang: (l: 'Hindi' | 'English') => void; checked: boolean; onChecked: (v: boolean) => void; error?: string; title?: string }) {
  return (
    <div className={cn('rounded-lg border p-3', error ? 'border-red-300 bg-red-50/40' : 'border-amber-200 bg-amber-50/50')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ShieldCheck size={15} className="text-amber-600" />
        <span className="text-[12px] font-semibold text-ink">{title}</span>
        <span className="text-[10.5px] text-muted">{ACK_VERSION}</span>
        <div className="ml-auto flex overflow-hidden rounded-md border border-line text-[11px]">
          {(['Hindi', 'English'] as const).map((l) => (
            <button key={l} type="button" onClick={() => onLang(l)} className={cn('px-2.5 py-1', lang === l ? 'bg-primary text-white' : 'bg-white text-ink-2')}>
              {l === 'Hindi' ? 'हिंदी' : 'English'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-2">{ACK_TEXT.Hindi}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{ACK_TEXT.English}</p>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] font-medium text-ink">
        <input type="checkbox" checked={checked} onChange={(e) => onChecked(e.target.checked)} className="h-4 w-4 accent-[#1e3f95]" />
        I accept ({lang === 'Hindi' ? 'मैं स्वीकार करता/करती हूँ' : 'recorded in English'})
      </label>
      {error && <p className="mt-1 text-[11px] text-brand-red">{error}</p>}
    </div>
  )
}

/** §17 role table for one module, highlighting the signed-in persona. */
export function RoleTableCard({ modules }: { modules: OpsModule[] }) {
  const role = useRole()
  const me = personaOf(role)
  const cols = ['Franchise', 'CRM', 'Finance', 'Operations', 'Admin'] as const
  return (
    <details className="rounded-xl border border-line bg-white shadow-xs">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-ink">
        <Lock size={13} className="text-primary" /> Role permissions (spec §17) · you are <span className="text-primary">{role}</span> → {me === 'None' ? 'no access' : me}
      </summary>
      <div className="scroll-thin overflow-x-auto border-t border-line">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className={TH}>Module</th>
              {cols.map((c) => (
                <th key={c} className={cn(TH, me === c && 'text-primary')}>
                  {c === 'CRM' ? 'CRM Executive' : c === 'Admin' ? 'Admin' : `${c}${c === 'Franchise' ? '' : ' Executive'}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m} className={TR}>
                <td className={cn(TD, 'font-medium')}>{m}</td>
                {cols.map((c) => (
                  <td key={c} className={cn(TD, me === c && 'bg-primary-soft font-semibold text-primary')}>
                    {ROLE_TABLE[m][c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[11px] text-muted">CRM and Operations executives share the "Operations Team" role in this build; action rights also follow Governance › Roles & Permissions.</p>
      </div>
    </details>
  )
}

export function NoAccess({ module }: { module: OpsModule }) {
  return (
    <div className="rounded-xl border border-line bg-white p-10 text-center">
      <Lock className="mx-auto text-slate-400" size={28} />
      <h2 className="mt-3 text-[16px] font-semibold text-ink">No access to {module}</h2>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted">Your role has no default access to this module (spec §17). Ask an Admin to grant explicit permission.</p>
      <div className="mx-auto mt-5 max-w-3xl text-left">
        <RoleTableCard modules={[module]} />
      </div>
    </div>
  )
}

export function Note({ tone = 'blue', children }: { tone?: 'blue' | 'amber' | 'red' | 'green'; children: ReactNode }) {
  const c = { blue: 'border-blue-200 bg-blue-50/60 text-blue-900', amber: 'border-amber-200 bg-amber-50/70 text-amber-900', red: 'border-red-200 bg-red-50/70 text-red-900', green: 'border-emerald-200 bg-emerald-50/70 text-emerald-900' }[tone]
  return <div className={cn('rounded-lg border px-3 py-2 text-[12px] leading-relaxed', c)}>{children}</div>
}

export function Timeline({ items }: { items: { at: string; by: string; text: string }[] }) {
  return (
    <ol className="space-y-3">
      {[...items].reverse().map((l, i) => (
        <li key={`${l.at}-${i}`} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <div className="text-[12.5px] text-ink">{l.text}</div>
            <div className="text-[11px] text-muted">
              {new Date(l.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {l.by}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: ReactNode }[] }) {
  return (
    <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} className={cn('-mb-px border-b-2 px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap', value === t.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
