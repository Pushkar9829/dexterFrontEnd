import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/cn'
import { apiEnabled, usePayoutData } from '@/data/payoutApi'

/** API mode: hydrates every payout store from the backend while any payout screen is open (no-op in mock mode). */
function PayoutDataGate({ children }: { children: ReactNode }) {
  const st = usePayoutData()
  return (
    <>
      {apiEnabled && st.loading && <div className="mb-2 rounded-md bg-blue-50 px-3 py-1.5 text-[12px] text-blue-700">Loading payout data from the server…</div>}
      {apiEnabled && st.error && <div className="mb-2 rounded-md bg-red-50 px-3 py-1.5 text-[12px] text-red-700">Some payout data could not be loaded: {st.error}</div>}
      {children}
    </>
  )
}
/** Wraps each payout <Route> element with the data gate. */
export const withPayoutData = (routes: ReactElement<{ element?: ReactNode }>[]) =>
  apiEnabled ? routes.map((r) => cloneElement(r, { element: <PayoutDataGate>{r.props.element}</PayoutDataGate> })) : routes

/**
 * Payout Management navigation (spec §3 + "tabs under Payout Management" design note).
 * All tabs keep one fixed width/height — never stretched to fill space (spec §3.2).
 */
export const PAYOUT_TABS: { label: string; to: string; end?: boolean }[] = [
  { label: 'Payout Overview (AI)', to: '/finance/payouts', end: true },
  { label: 'Account Mapping', to: '/finance/payouts/accounts' },
  { label: 'Monthly Payout', to: '/finance/payouts/monthly' },
  { label: 'Plan Mapping', to: '/finance/payouts/plans' },
  { label: 'Business Model', to: '/finance/payouts/business' },
  { label: 'Franchise', to: '/finance/payouts/franchise' },
  { label: 'Master Franchise', to: '/finance/payouts/mf' },
  { label: 'Super Master Franchise', to: '/finance/payouts/smf' },
  { label: 'Team Leader', to: '/finance/payouts/team-leader' },
]

export function PayoutTabs() {
  return (
    <nav className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Payout Management">
      {PAYOUT_TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'flex h-10 w-[168px] shrink-0 items-center justify-center rounded-lg border px-2 text-center text-[12px] font-semibold leading-tight transition-colors',
              isActive ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink-2 hover:border-primary/40 hover:text-primary',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Page frame for every Payout Management screen: breadcrumb, title row, the fixed tab bar. */
export function PayoutPage({ title, sub, crumbs, actions, children, tabs = true }: { title: string; sub?: string; crumbs: string[]; actions?: ReactNode; children: ReactNode; tabs?: boolean }) {
  return (
    <div className="max-w-[1500px] space-y-4 pb-12">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/dashboard" className="hover:text-[#0066FF]">Workspace</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF]">Finance</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/payouts" className="hover:text-[#0066FF]">Payouts</Link>
        {crumbs.map((c, i) => (
          <span key={c + i} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-slate-400" />
            <span className={i === crumbs.length - 1 ? 'font-semibold text-slate-800' : ''}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
          {sub && <p className="mt-1 text-[13px] text-slate-500">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <PayoutTabs />}
      {children}
    </div>
  )
}
