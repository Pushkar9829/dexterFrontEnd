import type { ReactNode } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { Brand } from '@/components/layout/Brand'

/** Split auth screen: navy brand panel (desktop) + centred card. On phones the panel collapses to a header. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* desktop brand panel */}
      <aside className="relative hidden w-[468px] shrink-0 overflow-hidden bg-auth px-10 py-12 text-white lg:flex lg:flex-col">
        <Brand tag="OPERATIONS CRM" />
        <div className="pointer-events-none absolute -right-28 top-24 h-[300px] w-[300px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-[190px] w-[190px] rotate-[28deg] rounded-[28px] border border-white/10" />

        <div className="mt-auto mb-auto max-w-[390px] pt-40">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
            <ShieldCheck size={14} /> Secure enterprise access
          </span>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            Coordinate uptime, reconcile cash movement and protect network access across India—from a single operations CRM.
          </p>
        </div>

        <div className="flex gap-14">
          <Trust icon={<Lock size={16} />} title="Encrypted" sub="Session protection" />
          <Trust icon={<ShieldCheck size={16} />} title="Controlled" sub="Role-based access" />
        </div>
      </aside>

      {/* mobile header */}
      <header className="flex items-center justify-between bg-auth px-5 py-5 lg:hidden">
        <Brand tag="OPERATIONS CRM" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white">
          <ShieldCheck size={13} /> Secure
        </span>
      </header>

      <main className="flex flex-1 items-start justify-center bg-surface px-4 py-8 sm:items-center sm:px-6 sm:py-12">
        <div className="w-full max-w-[500px] rounded-2xl border border-line bg-white p-6 shadow-[0_10px_40px_-12px_rgba(16,24,40,0.12)] sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function Trust({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10">{icon}</span>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[12px] text-white/70">{sub}</div>
      </div>
    </div>
  )
}

export function AuthTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-bold tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-muted">{sub}</p>}
    </div>
  )
}

export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'error'; title: string; children?: ReactNode }) {
  const style = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-100 bg-primary-soft text-primary'
  return (
    <div className={`rounded-lg border px-4 py-3 text-[13px] ${style}`}>
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-0.5 opacity-90">{children}</div>}
    </div>
  )
}

/** "+91 ••••• ••42" / "op••••@dexterindia.in" */
export function maskIdentity(channel: 'phone' | 'email', value: string) {
  if (channel === 'phone') return `+91 ••••• ••${value.replace(/\D/g, '').slice(-2)}`
  const [user, domain] = value.split('@')
  return `${user.slice(0, 2)}••••@${domain ?? ''}`
}
