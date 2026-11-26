import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Home, Landmark, LayoutDashboard, MapPin, Package, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/KpiCard'
import { cn } from '@/lib/cn'
import { useDaakState, useDaakLoad, daakLoader, INWARD_STATUSES, DELIVERY_STATUSES } from '@/data/daakData'
import { ActingAs, LoadBanner } from '../recon2/shared'
import { deliveryTone, fmtDt, inwardTone, rupees } from '../recon2/util'
import { canManageDak, useOpsUser } from '../recon2/opsAccess'
import InwardDakTab from './InwardDakTab'
import OutwardDakTab from './OutwardDakTab'
import AddressMasterPanel from './AddressMasterPanel'
import DakExpensesTab from './DakExpensesTab'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'inward', label: 'Inward Dak', Icon: ArrowDownLeft },
  { key: 'outward', label: 'Outward Dak', Icon: ArrowUpRight },
  { key: 'address-master', label: 'Address Master', Icon: MapPin },
  { key: 'expenses', label: 'Linked Expenses', Icon: Receipt },
  { key: 'cheques', label: 'Cheques in Custody', Icon: Landmark },
] as const
type TabKey = (typeof TABS)[number]['key']
// older links used ?tab=register / received / sent
const ALIAS: Record<string, TabKey> = { register: 'inward', received: 'inward', sent: 'outward', branch: 'dashboard', addresses: 'address-master' }

function Dashboard() {
  const { inward, outward, expenses } = useDaakState()
  const pendingInward = inward.filter((r) => r.status === 'Received' || r.status === 'Inwarded').length
  const inTransit = outward.filter((r) => r.deliveryStatus === 'Dispatched' || r.deliveryStatus === 'In Transit').length
  const noExpense = outward.filter((r) => r.charges > 0 && !r.expenseRef).length
  const spend = outward.reduce((s, r) => s + r.charges, 0)
  const recent = useMemo(
    () =>
      [
        ...inward.flatMap((r) => r.history.map((h) => ({ ...h, ref: r.id }))),
        ...outward.flatMap((r) => r.history.map((h) => ({ ...h, ref: r.id }))),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 10),
    [inward, outward],
  )
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inward dak" value={inward.length} caption={`${pendingInward} awaiting assignment / storage`} icon={<ArrowDownLeft size={16} />} />
        <StatCard label="Outward dak" value={outward.length} caption={`${inTransit} dispatched / in transit`} icon={<ArrowUpRight size={16} />} />
        <StatCard label="Courier spend" value={rupees(spend)} caption={`${expenses.length} linked HRMS expense(s)`} icon={<Receipt size={16} />} />
        <StatCard label="Expense not raised" value={noExpense} caption="Dispatches with charges but no expense ref." icon={<Package size={16} />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="mb-3 text-[13px] font-semibold">Inward by status</div>
          <div className="space-y-2">
            {INWARD_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-[12px]"><Badge tone={inwardTone(s)}>{s}</Badge><b>{inward.filter((r) => r.status === s).length}</b></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="mb-3 text-[13px] font-semibold">Outward by delivery status</div>
          <div className="space-y-2">
            {DELIVERY_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-[12px]"><Badge tone={deliveryTone(s)}>{s}</Badge><b>{outward.filter((r) => r.deliveryStatus === s).length}</b></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="mb-3 text-[13px] font-semibold">Recent movement</div>
          <ul className="space-y-2 text-[12px]">
            {recent.map((h, i) => (
              <li key={`${h.ref}-${h.at}-${i}`}>
                <b className="text-primary">{h.ref}</b> · {h.action}
                {h.to && <> → {h.to}</>}
                <div className="text-[11px] text-muted">{fmtDt(h.at)} · {h.by}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Cheques() {
  const { cheques } = useDaakState()
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[900px] text-[12px]">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Cheque</th>
            <th className="px-3 py-2 font-medium">Party</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Received in</th>
            <th className="px-3 py-2 font-medium">Custodian / vault</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {cheques.map((c) => (
            <tr key={c.chequeId} className="border-t border-line/70 align-top">
              <td className="px-3 py-2 font-semibold">{c.chequeId}<div className="text-[11px] font-normal text-muted">#{c.chequeNumber} · {c.bankName}</div></td>
              <td className="px-3 py-2">{c.partyName}<div className="text-[11px] text-muted">{c.franchiseeId} · {c.atmId}</div></td>
              <td className="px-3 py-2 text-right font-semibold">{rupees(c.amount)}</td>
              <td className="px-3 py-2"><Link to="/operations/daak/inward" className="text-primary hover:underline">{c.originatingDakId}</Link><div className="text-[11px] text-muted">{c.courier} · {c.receivedDate}</div></td>
              <td className="px-3 py-2">{c.custodian}<div className="text-[11px] text-muted">{c.vaultLocation}</div></td>
              <td className="px-3 py-2"><Badge tone={c.verificationStatus === 'Discrepancy' ? 'red' : c.verificationStatus === 'Verified' ? 'green' : 'amber'}>{c.verificationStatus}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DaakHub() {
  const { sub } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const u = useOpsUser()
  const load = useDaakLoad()
  const raw = sub ?? params.get('tab') ?? 'dashboard'
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : (ALIAS[raw] ?? 'dashboard')

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12">
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="shrink-0 text-slate-400" />
        <Link to="/dashboard" className="hover:text-primary">Workspace</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/operations" className="hover:text-primary">Operations</Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Postal & Courier (Dak)</span>
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Postal & Courier Management</h1>
          <p className="mt-0.5 text-[13px] text-muted">Complete digital record of inward and outgoing dak — receipt, custody, storage, dispatch, delivery and courier expense.</p>
        </div>
        {!canManageDak(u) && <Badge tone="amber">View only — Postal / Courier Executive or Admin manages records</Badge>}
      </div>
      <div className="mb-4"><ActingAs hint="Neha Sharma = Postal / Courier Executive · Meera Iyer = Admin approver" /></div>
      <LoadBanner state={load} onRetry={() => daakLoader.reload()} />
      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-line">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(key === 'dashboard' ? '/operations/daak' : `/operations/daak/${key}`)}
            className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-semibold', tab === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'inward' && <InwardDakTab />}
      {tab === 'outward' && <OutwardDakTab />}
      {tab === 'address-master' && <AddressMasterPanel />}
      {tab === 'expenses' && <DakExpensesTab />}
      {tab === 'cheques' && <Cheques />}
    </div>
  )
}
