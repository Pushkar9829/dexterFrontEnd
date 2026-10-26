import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  FileText,
  User,
  Phone,
  Calendar,
  Landmark,
  Save,
  CreditCard,
  Receipt,
  ListFilter,
  IndianRupee,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  emptyExpense,
  getExpense,
  saveExpense,
  type ExpenseRecord,
  type ExpenseCategory,
  type ExpenseStatus,
} from '@/data/financeExpenses'
import { SEED_EMPLOYEES, type Employee } from '@/data/employees'

const BANKS_LIST = [
  'HDFC Bank',
  'State Bank of India',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Canara Bank',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'Union Bank of India',
  'IndusInd Bank',
]

export default function StaffExpenseRecordPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [record, setRecord] = useState<ExpenseRecord>(() => {
    if (!isNew && id) {
      const found = getExpense(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    return emptyExpense()
  })

  useEffect(() => {
    if (!isNew && id) {
      const found = getExpense(id)
      if (found) {
        setRecord(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  // Employee options
  const empOptions = useMemo(() => {
    return SEED_EMPLOYEES.map((e: Employee) => ({
      empId: e.employeeCode,
      name: e.fullName,
      department: e.department,
      mobile: e.mobile,
    }))
  }, [])

  const handleEmpChange = (empId: string) => {
    const matched = empOptions.find((e) => e.empId === empId)
    if (matched) {
      setRecord((prev) => ({
        ...prev,
        empId,
        empName: matched.name,
        department: matched.department || prev.department,
        mobile: matched.mobile || prev.mobile,
      }))
      toast(`Loaded details for employee ${empId}`)
    } else {
      setRecord((prev) => ({ ...prev, empId }))
    }
  }

  const updateField = <K extends keyof ExpenseRecord>(key: K, value: ExpenseRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
  }

  // Calculations
  const billAmt = Number(record.billAmount) || 0
  const approvedAmt = record.approvedAmount ? Number(record.approvedAmount) : billAmt
  const dedAmt = Number(record.deductionAmount) || 0
  const finalReimbursement = Math.max(0, approvedAmt - dedAmt)

  const handleSave = (isDraft = false) => {
    if (!isDraft) {
      if (!record.empId && !record.empName) {
        toast('Please enter or select an Employee ID or Name', 'info')
        return
      }
      if (!record.billAmount) {
        toast('Please enter the Bill Amount', 'info')
        return
      }
    }

    const payload: ExpenseRecord = {
      ...record,
      approvedAmount: record.approvedAmount || String(billAmt),
      reimbursementAmount: record.reimbursementAmount || String(finalReimbursement),
      paymentStatus: record.paymentStatus || (isDraft ? 'Pending' : 'Approved'),
    }

    const saved = saveExpense(payload)
    toast(
      isDraft
        ? 'Expense draft saved successfully'
        : isNew
          ? `Expense claim ${saved.id} submitted successfully`
          : `Expense claim ${saved.id} updated successfully`
    )
    navigate('/finance/hr-payments/expenses')
  }

  return (
    <div className="space-y-4 pb-16 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/hr-payments" className="hover:text-[#0066FF] transition-colors">
          HR Payments
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance/hr-payments/expenses" className="hover:text-[#0066FF] transition-colors">
          Expenses
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isNew ? 'new' : record.id || id}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Receipt size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
                {isNew ? 'New Expense Claim' : `Expense Claim · ${record.id || id}`}
              </h1>
              {!isNew && record.paymentStatus && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                    record.paymentStatus === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : record.paymentStatus === 'Approved'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : record.paymentStatus === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {record.paymentStatus}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Submit and verify employee official field expenses, conveyance vouchers, and reimbursements.
            </p>
          </div>
        </div>

        {!isNew && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              S.N. #{record.sn || 1}
            </span>
          </div>
        )}
      </div>

      {/* CARD 1: Employee & Claim Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              1. Employee &amp; Claim Details
            </h2>
          </div>
          {record.id && (
            <span className="text-[11px] font-semibold text-[#0066FF] bg-white px-2 py-0.5 rounded border border-[#0066FF]/20 font-mono">
              {record.id}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Employee ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.empId || ''}
                  onChange={(e) => handleEmpChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all font-mono"
                >
                  <option value="">Select Employee</option>
                  {empOptions.map((e) => (
                    <option key={e.empId} value={e.empId}>
                      {e.empId} - {e.name}
                    </option>
                  ))}
                  {record.empId && !empOptions.some((e) => e.empId === record.empId) && (
                    <option value={record.empId}>{record.empId}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Employee Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Employee Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.empName || ''}
                  onChange={(e) => updateField('empName', e.target.value)}
                  placeholder="Full name"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Department
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.department || ''}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="e.g. Operations"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Contact Number
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.mobile || ''}
                  onChange={(e) => updateField('mobile', e.target.value)}
                  placeholder="Mobile number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Claim Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Claim Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="date"
                  value={record.claimDate || ''}
                  onChange={(e) => updateField('claimDate', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Expense Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Expense Incurred Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="date"
                  value={record.expenseDate || ''}
                  onChange={(e) => updateField('expenseDate', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Expense Classification & Invoicing */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Receipt size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            2. Expense Classification &amp; Invoicing
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Expense Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={record.category || 'Travel & Conveyance'}
                  onChange={(e) => updateField('category', e.target.value as ExpenseCategory)}
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bill Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bill / Receipt Number
              </label>
              <input
                type="text"
                value={record.billNumber || ''}
                onChange={(e) => updateField('billNumber', e.target.value)}
                placeholder="e.g. BILL/2026/042"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            {/* Bill Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bill Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="number"
                  value={record.billAmount || ''}
                  onChange={(e) => updateField('billAmount', e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Expense Description &amp; Business Purpose
            </label>
            <input
              type="text"
              value={record.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="e.g. Travel to client ATM site in Mainpuri for maintenance review"
              className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>
      </div>

      {/* CARD 3: Verification & Approval */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              3. Verification &amp; Approval
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-[#0066FF] bg-white px-2 py-0.5 rounded border border-[#0066FF]/20">
            Reimbursement: ₹{finalReimbursement.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Approved Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Approved Amount (₹)
              </label>
              <input
                type="number"
                value={record.approvedAmount || billAmt || ''}
                onChange={(e) => updateField('approvedAmount', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* GST / Tax */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GST / Tax Included (₹)
              </label>
              <input
                type="number"
                value={record.taxAmount || ''}
                onChange={(e) => updateField('taxAmount', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Deduction / Disallowed */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Deduction / Disallowed (₹)
              </label>
              <input
                type="number"
                value={record.deductionAmount || ''}
                onChange={(e) => updateField('deductionAmount', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Final Reimbursement */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                Final Reimbursement (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={record.reimbursementAmount || finalReimbursement || ''}
                onChange={(e) => updateField('reimbursementAmount', e.target.value)}
                placeholder="0"
                className="w-full h-8.5 px-3 text-[12px] font-bold rounded-lg border-2 border-[#0066FF] bg-blue-50/20 text-[#0066FF] outline-none"
              />
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[12px]">
            <div className="flex items-center gap-6 text-slate-600 font-medium">
              <span>
                Claimed: <strong className="text-slate-900 font-semibold">₹{billAmt.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Approved: <strong className="text-slate-900 font-semibold">₹{approvedAmt.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Deductions: <strong className="text-rose-600 font-semibold">₹{dedAmt.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Final Payable:</span>
              <span className="font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                ₹{finalReimbursement.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: Settlement & Bank Routing */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Landmark size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            4. Settlement &amp; Bank Routing
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Bank Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Settlement Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={record.bankName || 'HDFC Bank'}
                onChange={(e) => updateField('bankName', e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              >
                {BANKS_LIST.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={record.accountNumber || ''}
                onChange={(e) => updateField('accountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Account number"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={record.ifscCode || ''}
                onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001834"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono uppercase"
              />
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Status
              </label>
              <div className="relative">
                <ListFilter
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.paymentStatus || 'Pending'}
                  onChange={(e) => updateField('paymentStatus', e.target.value as ExpenseStatus)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  {EXPENSE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={record.paymentDate || ''}
                onChange={(e) => updateField('paymentDate', e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* UTR Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                UTR / Reference Number
              </label>
              <input
                type="text"
                value={record.utrNumber || ''}
                onChange={(e) => updateField('utrNumber', e.target.value.toUpperCase())}
                placeholder="Bank UTR"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono uppercase"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Remarks &amp; Audit Notes
            </label>
            <input
              type="text"
              value={record.remarks || ''}
              onChange={(e) => updateField('remarks', e.target.value)}
              placeholder="e.g. Approved as per field travel policy"
              className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/60 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9.5 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-sm"
          >
            <span>Save Expense Claim</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
