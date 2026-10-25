import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  FileText,
  Landmark,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { HubTile, type HubTileTheme } from '@/components/ui/HubTile'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/export'

interface FinanceTileConfig {
  title: string
  sub: string
  to: string
  Icon: typeof ShieldCheck
  theme: HubTileTheme
  tag: string
  reportsCount: string
}

const FINANCE_TILES: FinanceTileConfig[] = [
  {
    title: 'Security Deposit',
    sub: 'Track and manage security deposit details and transactions.',
    to: '/finance/sd',
    Icon: ShieldCheck,
    theme: 'emerald',
    tag: 'Deposits',
    reportsCount: '6 Reports',
  },
  {
    title: 'Cash Loading Funds (CLF)',
    sub: 'Manage cash loading funds, transactions and reconciliation.',
    to: '/finance/clf',
    Icon: Landmark,
    theme: 'amber',
    tag: 'Cash Loading',
    reportsCount: '5 Reports',
  },
  {
    title: 'GST',
    sub: 'Handle GST related data, invoices and returns.',
    to: '/finance/gst',
    Icon: FileText,
    theme: 'purple',
    tag: 'Tax & Invoices',
    reportsCount: '7 Reports',
  },
  {
    title: 'Payouts',
    sub: 'Process and track payouts for partners and vendors.',
    to: '/finance/payout',
    Icon: Wallet,
    theme: 'rose',
    tag: 'Settlements',
    reportsCount: '8 Reports',
  },
  {
    title: 'HR Payments',
    sub: 'Manage employee payments, allowances and deductions.',
    to: '/finance/hr-payments',
    Icon: Users,
    theme: 'blue',
    tag: 'Payroll',
    reportsCount: '4 Reports',
  },
]

const QUICK_ACCESS_ITEMS = [
  {
    title: 'Security Deposit',
    to: '/finance/sd',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Icon: ShieldCheck,
  },
  {
    title: 'Cash Loading Funds (CLF)',
    to: '/finance/clf',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    Icon: Landmark,
  },
  {
    title: 'GST',
    to: '/finance/gst',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
    Icon: FileText,
  },
  {
    title: 'Payouts',
    to: '/finance/payout',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    Icon: Wallet,
  },
  {
    title: 'HR Payments',
    to: '/finance/hr-payments',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    Icon: Users,
  },
]

// Mock HR Payments data
const HR_PAYMENTS_DATA = [
  { id: 'PAY-HR-26-081', empId: 'EMP-0142', name: 'Rahul Kumar', dept: 'Verification', amount: 48500, type: 'Monthly Salary', date: '2026-10-01', status: 'Disbursed' },
  { id: 'PAY-HR-26-082', empId: 'EMP-0118', name: 'Priya Menon', dept: 'Verification', amount: 62000, type: 'Monthly Salary', date: '2026-10-01', status: 'Disbursed' },
  { id: 'PAY-HR-26-083', empId: 'EMP-0205', name: 'Amit Jadhav', dept: 'Engineering', amount: 54000, type: 'Monthly Salary', date: '2026-10-01', status: 'Disbursed' },
  { id: 'PAY-HR-26-084', empId: 'EMP-0189', name: 'Vikram Shah', dept: 'Finance', amount: 71000, type: 'Monthly Salary', date: '2026-10-01', status: 'Disbursed' },
  { id: 'PAY-HR-26-085', empId: 'EMP-0231', name: 'Meera Iyer', dept: 'Operations', amount: 65000, type: 'Monthly Salary', date: '2026-10-01', status: 'Disbursed' },
  { id: 'PAY-HR-26-086', empId: 'EMP-0310', name: 'Sana Ali', dept: 'Field Sales', amount: 42000, type: 'Travel Allowance', date: '2026-10-05', status: 'Processing' },
  { id: 'PAY-HR-26-087', empId: 'EMP-0294', name: 'Rohan Pawar', dept: 'Engineering', amount: 18500, type: 'Field Reimbursement', date: '2026-10-08', status: 'Approved' },
]

export default function FinanceHub({ showHrModalInitial = false }: { showHrModalInitial?: boolean }) {
  const [hrModalOpen, setHrModalOpen] = useState(showHrModalInitial)
  const [hrFilter, setHrFilter] = useState('')

  const filteredHr = HR_PAYMENTS_DATA.filter(
    (item) =>
      item.name.toLowerCase().includes(hrFilter.toLowerCase()) ||
      item.empId.toLowerCase().includes(hrFilter.toLowerCase()) ||
      item.dept.toLowerCase().includes(hrFilter.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-12 font-sans">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Finance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage financial transactions, payouts, taxes and related activities.
        </p>
      </div>

      {/* ── 3. Main Layout: Tiles Grid + Quick Access ──────────────────────── */}
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        {/* Left Area: Tiles Grid (maintaining legal height, width & design pattern) */}
        <div className="min-w-0 flex-1 w-full">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCE_TILES.map((tile) => {
              if (tile.to === '/finance/hr-payments') {
                return (
                  <div key={tile.title} onClick={() => setHrModalOpen(true)} className="cursor-pointer">
                    <HubTile
                      title={tile.title}
                      sub={tile.sub}
                      to="/finance"
                      Icon={tile.Icon}
                      theme={tile.theme}
                      tag={tile.tag}
                      reportsCount={tile.reportsCount}
                    />
                  </div>
                )
              }
              return (
                <HubTile
                  key={tile.title}
                  title={tile.title}
                  sub={tile.sub}
                  to={tile.to}
                  Icon={tile.Icon}
                  theme={tile.theme}
                  tag={tile.tag}
                  reportsCount={tile.reportsCount}
                />
              )
            })}
          </div>
        </div>

        {/* Right Area: Quick Access Column */}
        <div className="w-full shrink-0 xl:w-[260px] 2xl:w-[276px]">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            {/* Header */}
            <div className="flex items-start gap-2.5">
              <Zap size={22} className="shrink-0 text-[#0066FF] fill-[#0066FF]" />
              <div>
                <h3 className="text-[15.5px] font-bold text-[#1E293B]">Quick Access</h3>
                <p className="mt-0.5 text-[11px] text-[#64748B] leading-tight">
                  Get to your important reports faster
                </p>
              </div>
            </div>

            {/* Quick Access List */}
            <div className="mt-4 space-y-2">
              {QUICK_ACCESS_ITEMS.map((item) => {
                if (item.to === '/finance/hr-payments') {
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setHrModalOpen(true)}
                      className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2.5 text-left transition-all duration-150 hover:bg-[#F8FAFC] hover:translate-x-0.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', item.iconBg)}>
                          <item.Icon size={16} />
                        </span>
                        <span className="truncate text-[12.5px] font-semibold text-[#1E293B]">
                          {item.title}
                        </span>
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-[#94A3B8]" />
                    </button>
                  )
                }
                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2.5 transition-all duration-150 hover:bg-[#F8FAFC] hover:translate-x-0.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', item.iconBg)}>
                        <item.Icon size={16} />
                      </span>
                      <span className="truncate text-[12.5px] font-semibold text-[#1E293B]">
                        {item.title}
                      </span>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-[#94A3B8]" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Interactive HR Payments Modal ──────────────────────────────── */}
      {hrModalOpen && (
        <Modal
          title="HR Payments & Payroll"
          sub="Disbursements, allowances, employee salaries and deduction tracking."
          onClose={() => setHrModalOpen(false)}
          width={900}
          footer={
            <div className="flex w-full items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={() => {
                  downloadCsv(
                    'hr-payments-export',
                    ['Voucher ID', 'Employee ID', 'Name', 'Department', 'Amount (INR)', 'Payment Type', 'Date', 'Status'],
                    filteredHr.map((r) => [r.id, r.empId, r.name, r.dept, String(r.amount), r.type, r.date, r.status]),
                  )
                  toast(`Exported ${filteredHr.length} records to CSV`)
                }}
              >
                Export CSV
              </Button>
              <Button onClick={() => setHrModalOpen(false)}>Close</Button>
            </div>
          }
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Search by employee name, ID or department..."
                value={hrFilter}
                onChange={(e) => setHrFilter(e.target.value)}
                className="h-9 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-[12px] text-ink outline-none placeholder:text-muted"
              />
              <span className="text-[12px] text-muted">
                {filteredHr.length} records
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[#F8FAFD] border-b border-line text-[11px] font-semibold text-muted">
                  <tr>
                    <th className="px-3.5 py-2.5">Voucher ID</th>
                    <th className="px-3.5 py-2.5">Employee</th>
                    <th className="px-3.5 py-2.5">Department</th>
                    <th className="px-3.5 py-2.5 text-right">Amount</th>
                    <th className="px-3.5 py-2.5">Type</th>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filteredHr.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-3.5 py-2 font-mono text-[11px] text-[#0066FF] font-medium">{r.id}</td>
                      <td className="px-3.5 py-2 font-medium text-ink">
                        {r.name}{' '}
                        <span className="text-[10px] text-muted font-normal">({r.empId})</span>
                      </td>
                      <td className="px-3.5 py-2 text-muted">{r.dept}</td>
                      <td className="px-3.5 py-2 text-right font-medium text-ink">₹ {r.amount.toLocaleString('en-IN')}</td>
                      <td className="px-3.5 py-2 text-muted">{r.type}</td>
                      <td className="px-3.5 py-2 text-muted">{r.date}</td>
                      <td className="px-3.5 py-2">
                        <Badge tone={r.status === 'Disbursed' ? 'green' : r.status === 'Processing' ? 'blue' : 'amber'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
