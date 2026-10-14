import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, CircleHelp, Lock, ShieldCheck, TrendingUp } from 'lucide-react'
import { Brand } from '@/components/layout/Brand'
import { cn } from '@/lib/cn'

/**
 * Left brand panel variants, per Figma:
 * - `intro`: "Secure enterprise access" chip + copy (01, 02, 04, 05)
 * - `showcase`: chip + headline + copy + Network operations card (03, 06)
 * - `status`: Network operations card only (07, 08)
 */
export type AuthPanel = 'intro' | 'showcase' | 'status'

/**
 * Split auth screen: navy brand panel (desktop) + centred card.
 * Below lg (Figma M01–M05) the page is plain white: dark wordmark + "Secure" pill, content without a card.
 */
export function AuthLayout({ children, panel = 'intro' }: { children: ReactNode; panel?: AuthPanel }) {
  return (
    <div className="flex min-h-full flex-col bg-white lg:flex-row lg:bg-surface">
      {/* desktop brand panel */}
      <aside className="relative hidden w-[458px] shrink-0 overflow-hidden bg-auth px-10 py-8 text-white lg:flex lg:flex-col">
        <Brand tag="OPERATIONS CRM" />
        <div className="pointer-events-none absolute -right-28 top-16 h-[300px] w-[300px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-[190px] w-[190px] rotate-[28deg] rounded-[28px] border border-white/10" />

        <div className={cn('relative my-auto max-w-[380px]', panel === 'intro' && 'pt-0', panel === 'showcase' && 'pt-14')}>
          {panel !== 'status' && <Chip />}
          {panel === 'showcase' && (
            <h2 className="mt-4 text-[30px] leading-[1.15] font-bold tracking-tight">One secure view of every ATM, cash route and franchise operation.</h2>
          )}
          {panel !== 'status' && (
            <p className="mt-4 text-[14px] leading-relaxed text-white/85">
              Coordinate uptime, reconcile cash movement and protect network access across India—from a single operations CRM.
            </p>
          )}
          {panel !== 'intro' && <NetworkCard className={panel === 'showcase' ? 'mt-14' : ''} />}
        </div>

        <div className="relative flex gap-14">
          <Trust icon={<Lock size={15} />} title="Encrypted" sub="Session protection" />
          <Trust icon={<ShieldCheck size={15} />} title="Controlled" sub="Role-based access" />
        </div>
      </aside>

      {/* mobile header (M01–M05) */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2 lg:hidden">
        <Brand tag="OPERATIONS CRM" tone="dark" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Lock size={11} /> Secure
        </span>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pt-5 pb-10 lg:items-center lg:px-6 lg:py-12">
        <div className="w-full max-w-[490px] lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-[33px] lg:shadow-[0_10px_40px_-12px_rgba(16,24,40,0.12)]">
          {children}
        </div>
      </main>
    </div>
  )
}

function Chip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold">
      <ShieldCheck size={13} /> Secure enterprise access
    </span>
  )
}

function NetworkCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-white/10 bg-white/[0.06] p-4', className)}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-2 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Network operations
        </span>
        <span className="text-white/75">Live · 09:42</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Metric label="ATM uptime" value="99.98%" />
        <Metric label="Cash healthy" value="1,284" />
      </div>
      <div className="mt-2.5 flex items-center gap-3 rounded-lg bg-white/[0.07] p-2.5">
        <span className="grid h-11 w-11 shrink-0 place-items-end rounded bg-white p-1.5">
          <span className="h-0.5 w-full rounded bg-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold">Cash replenishment cleared</div>
          <div className="mt-0.5 text-[11px] text-white/75">North Zone · 148 terminals reconciled</div>
          <div className="mt-1.5 h-0.5 rounded bg-white/20" />
        </div>
        <TrendingUp size={14} className="shrink-0 text-emerald-400" />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.07] px-2.5 py-2">
      <div className="text-[11px] text-white/80">{label}</div>
      <div className="mt-0.5 text-[18px] font-bold">{value}</div>
    </div>
  )
}

function Trust({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10">{icon}</span>
      <div className="leading-tight">
        <div className="text-[12px] font-semibold">{title}</div>
        <div className="text-[11px] text-white/70">{sub}</div>
      </div>
    </div>
  )
}

export function AuthTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-[22px] leading-[30px] font-bold tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-1.5 text-[13px] leading-[21px] text-muted">{sub}</p>}
    </div>
  )
}

const alertStyle = {
  error: { box: 'bg-red-50 text-brand-red', body: 'text-muted', Icon: CircleAlert },
  success: { box: 'bg-emerald-50 text-emerald-700', body: 'text-muted', Icon: CircleCheck },
  info: { box: 'bg-primary-soft text-primary', body: 'text-muted', Icon: CircleHelp },
}

/** Feedback band (09 inventory): Incorrect password, Code expired, Protected verification, Compliance notice… */
export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'error' | 'success'; title: string; children?: ReactNode }) {
  const s = alertStyle[tone]
  return (
    <div className={cn('flex gap-2.5 rounded-lg px-3.5 py-3 text-[12px]', s.box)}>
      <s.Icon size={16} className="mt-px shrink-0" />
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {children && <div className={cn('mt-0.5 leading-snug', s.body)}>{children}</div>}
      </div>
    </div>
  )
}

/** "+91 ••••• ••42" / "op••••@dexterindia.in" */
export function maskIdentity(channel: 'phone' | 'email', value: string) {
  if (channel === 'phone') return `+91 ••••• ••${value.replace(/\D/g, '').slice(-2)}`
  const [user, domain] = value.split('@')
  return `${user.slice(0, 2)}••••@${domain ?? ''}`
}
