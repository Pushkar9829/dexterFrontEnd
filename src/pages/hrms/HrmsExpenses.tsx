import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'

interface ExpenseClaim {
  id: string
  claimNo: string
  empId: string
  empName: string
  department: string
  category: 'Travel' | 'Food & Meals' | 'Lodging' | 'Fuel / Conveyance' | 'Field Supplies'
  date: string
  amount: number
  description: string
  receiptName: string
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected'
}

const INITIAL_EXPENSES: ExpenseClaim[] = [
  {
    id: 'exp-1',
    claimNo: 'EXP-2026-0891',
    empId: 'EMP-0101',
    empName: 'Harsh Pratap Singh',
    department: 'Operations',
    category: 'Travel',
    date: '2026-10-23',
    amount: 3850,
    description: 'Pune to Kolhapur ATM cluster emergency maintenance site travel',
    receiptName: 'toll_and_fuel_receipt.pdf',
    status: 'Pending',
  },
  {
    id: 'exp-2',
    claimNo: 'EXP-2026-0888',
    empId: 'EMP-0104',
    empName: 'Rajesh Nair',
    department: 'Operations',
    category: 'Fuel / Conveyance',
    date: '2026-10-22',
    amount: 1420,
    description: 'Local cash loading route transit scooter petrol bills',
    receiptName: 'petrol_hpcl_kol.jpg',
    status: 'Pending',
  },
  {
    id: 'exp-3',
    claimNo: 'EXP-2026-0885',
    empId: 'EMP-0106',
    empName: 'Vikram Joshi',
    department: 'Franchise Support',
    category: 'Lodging',
    date: '2026-10-20',
    amount: 4500,
    description: 'Master Franchise orientation meeting overnight stay in Ahmedabad',
    receiptName: 'hotel_ginger_inv_882.pdf',
    status: 'Approved',
  },
  {
    id: 'exp-4',
    claimNo: 'EXP-2026-0880',
    empId: 'EMP-0103',
    empName: 'Pooja Deshmukh',
    department: 'Legal & Compliance',
    category: 'Field Supplies',
    date: '2026-10-18',
    amount: 2200,
    description: 'Stamp papers and notarization fees for 4 LOI agreements',
    receiptName: 'notary_stamps_bill.pdf',
    status: 'Paid',
  },
  {
    id: 'exp-5',
    claimNo: 'EXP-2026-0875',
    empId: 'EMP-0102',
    empName: 'Amitabh Sharma',
    department: 'Finance',
    category: 'Food & Meals',
    date: '2026-10-15',
    amount: 980,
    description: 'Auditor review team working dinner refreshment invoice',
    receiptName: 'swiggy_invoice_331.pdf',
    status: 'Paid',
  },
  {
    id: 'exp-6',
    claimNo: 'EXP-2026-0869',
    empId: 'EMP-0107',
    empName: 'Kavita Pillai',
    department: 'Technology',
    category: 'Field Supplies',
    date: '2026-10-12',
    amount: 1850,
    description: 'LAN cables and RJ45 crimping tool for Lucknow ATM network switch',
    receiptName: 'hardware_bill.pdf',
    status: 'Rejected',
  },
]

export default function HrmsExpenses() {
  const [claims, setClaims] = useState<ExpenseClaim[]>(INITIAL_EXPENSES)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // New Claim Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newEmpName, setNewEmpName] = useState('')
  const [newDept, setNewDept] = useState('Operations')
  const [newCategory, setNewCategory] = useState<ExpenseClaim['category']>('Travel')
  const [newAmount, setNewAmount] = useState('')
  const [newDate, setNewDate] = useState('2026-10-25')
  const [newDesc, setNewDesc] = useState('')

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          c.claimNo.toLowerCase().includes(q) ||
          c.empName.toLowerCase().includes(q) ||
          c.empId.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (categoryFilter && c.category !== categoryFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      return true
    })
  }, [claims, search, categoryFilter, statusFilter])

  const stats = useMemo(() => {
    const total = claims.length
    const pendingClaims = claims.filter((c) => c.status === 'Pending')
    const pendingAmount = pendingClaims.reduce((acc, curr) => acc + curr.amount, 0)

    const approvedClaims = claims.filter((c) => c.status === 'Approved')
    const approvedAmount = approvedClaims.reduce((acc, curr) => acc + curr.amount, 0)

    const paidClaims = claims.filter((c) => c.status === 'Paid')
    const paidAmount = paidClaims.reduce((acc, curr) => acc + curr.amount, 0)

    return {
      total,
      pendingCount: pendingClaims.length,
      pendingAmount,
      approvedAmount,
      paidAmount,
    }
  }, [claims])

  const handleApprove = (id: string, claimNo: string) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Approved' } : c))
    )
    toast(`Approved expense claim ${claimNo}`)
  }

  const handleReject = (id: string, claimNo: string) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Rejected' } : c))
    )
    toast(`Rejected expense claim ${claimNo}`, 'info')
  }

  const handleExport = () => {
    const headers = [
      'Claim No',
      'Employee ID',
      'Employee Name',
      'Department',
      'Category',
      'Claim Date',
      'Amount (INR)',
      'Description',
      'Receipt File',
      'Status',
    ]
    const rows = filtered.map((c) => [
      c.claimNo,
      c.empId,
      c.empName,
      c.department,
      c.category,
      c.date,
      String(c.amount),
      c.description,
      c.receiptName,
      c.status,
    ])
    downloadCsv(`HRMS_Expense_Claims_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filtered.length} expense claims to CSV`)
  }

  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmpName.trim() || !newAmount || isNaN(Number(newAmount))) {
      toast('Please enter valid employee name and amount', 'info')
      return
    }

    const newClaim: ExpenseClaim = {
      id: `exp-${Date.now()}`,
      claimNo: `EXP-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      empId: `EMP-${String(Math.floor(1000 + Math.random() * 9000))}`,
      empName: newEmpName.trim(),
      department: newDept,
      category: newCategory,
      date: newDate,
      amount: Number(newAmount),
      description: newDesc || 'Travel & field expense claim',
      receiptName: 'receipt_claim_scan.pdf',
      status: 'Pending',
    }

    setClaims([newClaim, ...claims])
    toast(`Created expense claim ${newClaim.claimNo} for ₹${newClaim.amount.toLocaleString('en-IN')}`)
    setIsModalOpen(false)
    setNewEmpName('')
    setNewAmount('')
    setNewDesc('')
  }

  return (
    <div className="mx-auto max-w-[1300px] pb-16 font-sans">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-[#64748B]">
        <Link to="/dashboard" className="hover:text-[#0066FF]">
          Workspace
        </Link>
        <span>&gt;</span>
        <Link to="/hrms" className="hover:text-[#0066FF]">
          HRMS
        </Link>
        <span>&gt;</span>
        <span className="font-medium text-[#1E293B]">Expenses</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/hrms"
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50 hover:text-[#0066FF]"
              title="Back to HRMS"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-[26px] font-bold tracking-tight text-[#0F172A]">Expense Claims & Reimbursements</h1>
          </div>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Submit, verify, and approve field travel, lodging, meal, and operational expense vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="h-9 border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-50"
          >
            <Download size={14} className="mr-1.5 text-[#0066FF]" /> Export
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-9 bg-[#0066FF] text-white hover:bg-[#0052CC]"
          >
            <Plus size={15} className="mr-1.5" /> New Claim
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Pending Approvals</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-amber-600">
            ₹{stats.pendingAmount.toLocaleString('en-IN')}
          </div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">{stats.pendingCount} claims awaiting approval</p>
        </div>

        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Approved</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-emerald-600">
            ₹{stats.approvedAmount.toLocaleString('en-IN')}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700">Ready for payment disbursement</p>
        </div>

        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Reimbursed / Paid</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#0066FF]">
              <Wallet size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#0066FF]">
            ₹{stats.paidAmount.toLocaleString('en-IN')}
          </div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Disbursed to employees</p>
        </div>

        <div className="rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#64748B]">Total Claims</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <Receipt size={16} />
            </span>
          </div>
          <div className="mt-2 text-[24px] font-bold text-[#0F172A]">{stats.total}</div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Logged in current period</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="mb-6 rounded-xl border border-[#DCE8F6] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3 text-[13px] font-semibold text-[#1E293B]">
          <Filter size={15} className="text-[#0066FF]" />
          <span>Filters</span>
        </div>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Search Claim / Employee</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Claim #, Employee Name, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
            >
              <option value="">All Categories</option>
              <option value="Travel">Travel</option>
              <option value="Food & Meals">Food & Meals</option>
              <option value="Lodging">Lodging</option>
              <option value="Fuel / Conveyance">Fuel / Conveyance</option>
              <option value="Field Supplies">Field Supplies</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#475569]">Status</label>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="Rejected">Rejected</option>
              </select>
              {(search || categoryFilter || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('')
                    setStatusFilter('')
                  }}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 hover:text-[#0066FF]"
                  title="Reset Filters"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-[#DCE8F6] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#DCE8F6] bg-[#F8FAFD] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
              <Receipt size={14} />
            </span>
            <span className="text-[13.5px] font-semibold text-[#0F172A]">Claim Register</span>
          </div>
          <span className="text-[12px] text-[#64748B]">Showing {filtered.length} claims</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#DCE8F6] bg-[#EAF2FD]/70 text-[11px] font-bold uppercase tracking-wider text-[#334155]">
                <th className="py-3 px-4 w-32">Claim #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Claim Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length > 0 ? (
                filtered.map((c) => {
                  const badgeColor =
                    c.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : c.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : c.status === 'Paid'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'

                  return (
                    <tr key={c.id} className="transition-colors hover:bg-[#F8FAFD]">
                      <td className="py-3.5 px-4 font-mono font-medium text-[#0066FF]">{c.claimNo}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1E293B]">{c.empName}</div>
                        <div className="text-[11px] text-[#64748B]">{c.empId} · {c.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-medium text-[#334155]">
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">{c.date}</td>
                      <td className="py-3.5 px-4 text-[#334155] max-w-[260px] truncate" title={c.description}>
                        {c.description}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">
                        ₹{c.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-[#0066FF] hover:underline cursor-pointer">
                          <FileText size={12} />
                          <span className="max-w-[100px] truncate">{c.receiptName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeColor}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {c.status === 'Pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(c.id, c.claimNo)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Approve Claim"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(c.id, c.claimNo)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Reject Claim"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8]">Completed</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    No expense claims match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Claim Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-[#DCE8F6]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF]/10 text-[#0066FF]">
                  <Receipt size={16} />
                </span>
                <h3 className="text-[16px] font-bold text-[#0F172A]">Submit Expense Claim</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-[#64748B] hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-[12.5px] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal & Compliance">Legal & Compliance</option>
                    <option value="Technology">Technology</option>
                    <option value="Franchise Support">Franchise Support</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-[12.5px] outline-none focus:border-[#0066FF]"
                  >
                    <option value="Travel">Travel</option>
                    <option value="Food & Meals">Food & Meals</option>
                    <option value="Lodging">Lodging</option>
                    <option value="Fuel / Conveyance">Fuel / Conveyance</option>
                    <option value="Field Supplies">Field Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2500"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 text-[12.5px] outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#334155] mb-1">Claim Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-[12.5px] outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#334155] mb-1">Claim Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide brief details about the expense purpose..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] p-2.5 text-[12.5px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-slate-50 p-3 text-center">
                <FileText size={18} className="mx-auto text-[#64748B] mb-1" />
                <span className="text-[12px] text-[#475569] font-medium">Attach Receipt or Bill (PDF / JPG)</span>
                <p className="text-[10.5px] text-[#94A3B8]">Supports scans up to 5MB</p>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-[#F1F5F9] pt-3.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#CBD5E1]"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-[#0066FF] text-white hover:bg-[#0052CC]">
                  Submit Claim
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
