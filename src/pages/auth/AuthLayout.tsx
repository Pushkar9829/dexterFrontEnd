import type { ReactNode } from 'react'
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Lock,
  ShieldCheck,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type AuthPanel = 'intro' | 'showcase' | 'status'

/**
 * Split auth screen: Elevated enterprise navy brand panel (desktop) + centered modern card.
 */
export function AuthLayout({ children, panel: _panel = 'intro' }: { children: ReactNode; panel?: AuthPanel }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP ENTERPRISE BRAND PANEL (LEFT) */}
      {/* ────────────────────────────────────────────────────────── */}
      <aside className="relative hidden w-[480px] xl:w-[530px] shrink-0 overflow-hidden bg-gradient-to-b from-[#061536] via-[#0B2A6B] to-[#081F4D] px-10 py-9 text-white lg:flex lg:flex-col justify-between shadow-2xl select-none">
        {/* Ambient glowing radial lights & grid lines */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#05112B] to-transparent" />

        {/* Concentric Telemetry Ping Rings in background */}
        <div className="pointer-events-none absolute -right-24 top-20 h-[340px] w-[340px] rounded-full border border-white/10 opacity-70" />
        <div className="pointer-events-none absolute -right-12 top-32 h-[220px] w-[220px] rounded-full border border-blue-400/20" />
        <div className="pointer-events-none absolute right-10 top-52 h-[80px] w-[80px] rounded-full border border-cyan-400/30 animate-pulse" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <img
            src="/dexter-logo.png"
            alt="Dexter India"
            className="h-12 w-auto object-contain drop-shadow-md select-none"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-black tracking-wide text-white drop-shadow-xs">
                DEXTER INDIA
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#0066FF] text-white text-[10px] font-black tracking-widest uppercase shadow-xs">
                CRM
              </span>
            </div>
            <span className="text-[10.5px] font-semibold text-blue-200/80 tracking-wider uppercase mt-0.5">
              Enterprise Operations Portal
            </span>
          </div>
        </div>

        {/* Middle Main Narrative & Telemetry Card */}
        <div className="relative z-10 my-auto py-6 max-w-[440px]">
          {/* Security Chip */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11.5px] font-bold text-blue-100 border border-white/15 backdrop-blur-xs shadow-xs">
            <ShieldCheck size={14} className="text-[#00D4FF]" />
            <span>Secure Enterprise Gateway</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </div>

          {/* Value Headline */}
          <h2 className="mt-4 text-[26px] xl:text-[29px] leading-[1.2] font-black tracking-tight text-white drop-shadow-sm">
            Unified Command Center for ATM Franchises & Cash Routes
          </h2>

          {/* Live Network Operations Card */}
          <div className="mt-6">
            <NetworkCard />
          </div>
        </div>

        {/* Bottom Trust & Compliance Row */}
        <div className="relative z-10 pt-5 border-t border-white/10">
          {/* Translucent Indian Architectural Skyline Silhouette along base */}
          <div className="mt-5 w-full h-8 overflow-hidden opacity-25 flex items-end justify-center text-blue-200 pointer-events-none">
            <svg viewBox="0 0 500 80" className="w-full h-full" fill="currentColor">
              <path d="M0,80 L20,80 L20,60 L30,60 L30,40 L40,40 L40,30 L45,20 L50,30 L50,40 L60,40 L60,60 L70,60 L70,80 L100,80 L100,50 L110,50 L110,35 L120,35 L120,15 L125,5 L130,15 L130,35 L140,35 L140,50 L150,50 L150,80 L190,80 L190,45 L200,45 L200,30 L210,30 L210,80 L240,80 L240,40 L260,25 L280,40 L280,80 L310,80 L310,50 L320,35 L330,35 L330,20 L335,10 L340,20 L340,35 L350,35 L350,50 L360,50 L360,80 L400,80 L400,55 L410,55 L410,40 L420,40 L420,80 L450,80 L450,45 L460,45 L460,25 L470,25 L470,80 L500,80 Z" />
            </svg>
          </div>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE HEADER (BELOW LG) */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 pt-5 pb-3 lg:hidden bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <img src="/dexter-logo.png" alt="Dexter India" className="h-8 w-auto object-contain" />
          <span className="px-1.5 py-0.5 rounded bg-[#0066FF] text-white text-[9px] font-black uppercase tracking-wider">
            CRM
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[11px] font-bold text-[#0066FF]">
          <Lock size={11} /> Enterprise Secure
        </span>
      </header>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. MAIN FORM CANVAS (RIGHT) */}
      {/* ────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10 bg-gradient-to-br from-slate-50 via-[#F3F7FD] to-slate-100">
        <div className="w-full max-w-[510px] rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(11,42,107,0.12)]">
          {children}
        </div>
      </main>
    </div>
  )
}

function NetworkCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/15 bg-white/[0.08] p-4.5 backdrop-blur-md shadow-xl transition-all hover:bg-white/[0.1]',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between text-[11.5px] pb-3 border-b border-white/10">
        <span className="flex items-center gap-2 font-bold text-white">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span>Live ATM Telemetry · 28 States</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10.5px] border border-emerald-400/30">
          99.98% Live
        </span>
      </div>

      {/* Metric Counters */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Metric label="Active Kiosks" value="1,284" change="+12" />
        <Metric label="Cash Reconciled" value="₹18.4 Cr" sub="Today" />
        <Metric label="Field SLA" value="18 min" sub="Avg" />
      </div>

      {/* Live Operational Highlight Feed */}
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.07] p-2.5 border border-white/10">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
          <Activity size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-bold text-white flex items-center justify-between">
            <span className="truncate">Cash Replenishment Verified</span>
            <span className="text-[9.5px] text-emerald-300 font-mono">10:42 AM</span>
          </div>
          <div className="text-[10px] text-blue-200/80 truncate">North Zone · 148 terminals reconciled</div>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  change,
  sub,
}: {
  label: string
  value: string
  change?: string
  sub?: string
}) {
  return (
    <div className="rounded-xl bg-white/[0.07] p-2.5 border border-white/5">
      <div className="text-[10px] font-medium text-blue-200/75 truncate">{label}</div>
      <div className="mt-1 text-[16px] font-black text-white leading-none tracking-tight">{value}</div>
      {(change || sub) && (
        <div className="mt-1 text-[9.5px] font-semibold text-emerald-300 flex items-center gap-0.5">
          {change && <span>↑ {change}</span>}
          {sub && <span className="text-blue-200/60 font-normal">{sub}</span>}
        </div>
      )}
    </div>
  )
}


export function AuthTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-[24px] sm:text-[26px] leading-[32px] font-black tracking-tight text-[#0B2A6B]">
        {title}
      </h1>
      {sub && <p className="mt-1 text-[13px] leading-[21px] text-slate-500 font-medium">{sub}</p>}
    </div>
  )
}

const alertStyle = {
  error: { box: 'bg-rose-50 text-rose-700 border border-rose-200', body: 'text-rose-600', Icon: CircleAlert },
  success: { box: 'bg-emerald-50 text-emerald-700 border border-emerald-200', body: 'text-emerald-600', Icon: CircleCheck },
  info: { box: 'bg-blue-50 text-blue-700 border border-blue-200', body: 'text-blue-600', Icon: CircleHelp },
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'error' | 'success'
  title: string
  children?: ReactNode
}) {
  const s = alertStyle[tone]
  return (
    <div className={cn('flex gap-2.5 rounded-xl px-3.5 py-3 text-[12px] shadow-2xs', s.box)}>
      <s.Icon size={16} className="mt-px shrink-0" />
      <div>
        <div className="text-[12.5px] font-bold">{title}</div>
        {children && <div className={cn('mt-0.5 leading-snug', s.body)}>{children}</div>}
      </div>
    </div>
  )
}

export function maskIdentity(channel: 'phone' | 'email', value: string) {
  if (channel === 'phone') return `+91 ••••• ••${value.replace(/\D/g, '').slice(-2)}`
  const [user, domain] = value.split('@')
  return `${user.slice(0, 2)}••••@${domain ?? ''}`
}
