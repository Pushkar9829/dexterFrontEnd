import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  FileText,
  IndianRupee,
  Link as LinkIcon,
  Luggage,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/cn'
import {
  ALL_EXPENSE_HEADS,
  DEFAULT_EMPLOYEE,
  EXPENSE_SUMMARY_REPORT_DATA,
  INITIAL_APPROVALS,
  INITIAL_FIELD_EXPENSES,
  INITIAL_OFFICE_EXPENSES,
  TOP_EXPENSE_HEADS,
  type ApprovalClaim,
  type EmployeeInfo,
  type ExpenseClaimItem,
  type ExpenseReportRow,
} from '@/data/expensesData'

type TabType =
  | 'overview'
  | 'my-claims'
  | 'office'
  | 'field'
  | 'other'
  | 'approvals'
  | 'payments'
  | 'reports'
  | 'master'

interface MasterExpenseHead {
  id: string
  name: string
  category: string
  singleLimit: number
  monthlyCap: number
  receiptMandatory: boolean
  status: 'Active' | 'Inactive'
  applicableTo: string
  notes?: string
}

export default function HrmsExpenses() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabType) || 'overview'

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab })
  }

  // Employee details state
  const [employee] = useState<EmployeeInfo>(DEFAULT_EMPLOYEE)

  // Office Expenses State (Image 4)
  const [officeExpenses, setOfficeExpenses] = useState<ExpenseClaimItem[]>(INITIAL_OFFICE_EXPENSES)
  const [officeStatus] = useState<'Submitted' | 'Senior Approved' | 'Paid'>('Submitted')
  const [officeDeclaration, setOfficeDeclaration] = useState(true)

  // Field Expenses State (Image 5)
  const [fieldExpenses, setFieldExpenses] = useState<ExpenseClaimItem[]>(INITIAL_FIELD_EXPENSES)
  const [fieldStatus] = useState<'Submitted' | 'Senior Approved' | 'Paid'>('Submitted')
  const [fieldDeclaration, setFieldDeclaration] = useState(true)

  // Other Staff Expenses State
  const [otherExpenses, setOtherExpenses] = useState<ExpenseClaimItem[]>([
    {
      id: 'oth-1',
      date: '10.08.2026',
      category: 'Pantry & Tea',
      purpose: 'Monthly tea & refreshment for branch office staff',
      vendorRef: 'CASH-REC-441',
      amount: 850,
      paymentMode: 'Cash',
      receiptName: 'Pantry_Cash_Slip.pdf',
      remarks: 'Staff Welfare',
    },
    {
      id: 'oth-2',
      date: '22.08.2026',
      category: 'Housekeeping Consumables',
      purpose: 'Cleaning supplies & phenyl for Bewar office',
      vendorRef: 'INV-CL-009',
      amount: 620,
      paymentMode: 'UPI',
      receiptName: 'Cleaning_Supplies.pdf',
      remarks: '-',
    },
  ])

  // Approvals State (Tab 6)
  const [approvals, setApprovals] = useState<ApprovalClaim[]>(INITIAL_APPROVALS)

  // Reports Filter State (Image 3)
  const [reportFromDate, setReportFromDate] = useState('01.08.2026')
  const [reportToDate, setReportToDate] = useState('31.08.2026')
  const [reportEmpType, setReportEmpType] = useState('All (Office/Field/Other)')
  const [reportDept, setReportDept] = useState('All Departments')
  const [reportHead, setReportHead] = useState('All (24 Heads)')
  const [reportData, setReportData] = useState<ExpenseReportRow[]>(EXPENSE_SUMMARY_REPORT_DATA)

  // New Claim Modal State (Image 2)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimSegment, setClaimSegment] = useState<'Office' | 'Field' | 'Other'>('Office')
  const [newExpenseDate, setNewExpenseDate] = useState('2026-08-17')
  const [newAmount, setNewAmount] = useState('1250')
  const [newHead, setNewHead] = useState('Fuel & Vehicle Running Expenses')
  const [newPaymentMode, setNewPaymentMode] = useState<'UPI' | 'Cash' | 'Card' | 'Net Banking'>('UPI')
  const [newPurpose, setNewPurpose] = useState('Client site visit - Bewar to Mainpuri')
  const [newVendorRef, setNewVendorRef] = useState('UTR - 589110003236')
  const [newAttachedFile, setNewAttachedFile] = useState<string | null>('Fuel_Bill_0508.pdf')
  const [newDeclaration, setNewDeclaration] = useState(true)

  // Add Item to Office / Field Inline Modal
  const [showAddRowModal, setShowAddRowModal] = useState(false)
  const [rowForTab, setRowForTab] = useState<'office' | 'field'>('office')
  const [rowDate, setRowDate] = useState('2026-08-30')
  const [rowCategory, setRowCategory] = useState('Speed Post')
  const [rowRoute, setRowRoute] = useState('')
  const [rowPurpose, setRowPurpose] = useState('')
  const [rowVendor, setRowVendor] = useState('')
  const [rowKm, setRowKm] = useState('')
  const [rowAmount, setRowAmount] = useState('')
  const [rowPaymentMode, setRowPaymentMode] = useState<'UPI' | 'Cash' | 'Card' | 'Net Banking'>('UPI')
  const [rowFile, setRowFile] = useState('receipt_doc.pdf')
  const [rowRemarks, setRowRemarks] = useState('-')

  // Add Expense Head Modal State (Master tab)
  const [showHeadModal, setShowHeadModal] = useState(false)
  const [headSearch, setHeadSearch] = useState('')
  const [headFilterCat, setHeadFilterCat] = useState('All Categories')
  const [headName, setHeadName] = useState('')
  const [headCategory, setHeadCategory] = useState('Office Administration')
  const [headSingleLimit, setHeadSingleLimit] = useState('3000')
  const [headMonthlyCap, setHeadMonthlyCap] = useState('25000')
  const [headReceiptMandatory, setHeadReceiptMandatory] = useState(true)
  const [headStatus, setHeadStatus] = useState<'Active' | 'Inactive'>('Active')
  const [headApplicableTo, setHeadApplicableTo] = useState('All Employees')
  const [headNotes, setHeadNotes] = useState('')

  const [masterHeads, setMasterHeads] = useState<MasterExpenseHead[]>(() =>
    ALL_EXPENSE_HEADS.map((head, idx) => ({
      id: `head-${idx + 1}`,
      name: head,
      category:
        idx % 3 === 0
          ? 'Travel & Field'
          : idx % 3 === 1
          ? 'Office Administration'
          : 'Staff Welfare',
      singleLimit: (idx + 2) * 1500,
      monthlyCap: (idx + 2) * 8000,
      receiptMandatory: true,
      status: 'Active',
      applicableTo: 'All Employees',
      notes: `Standard company reimbursement guideline for ${head}.`,
    }))
  )

  const filteredMasterHeads = useMemo(() => {
    return masterHeads.filter((item) => {
      const matchSearch =
        !headSearch.trim() || item.name.toLowerCase().includes(headSearch.toLowerCase())
      const matchCat = headFilterCat === 'All Categories' || item.category === headFilterCat
      return matchSearch && matchCat
    })
  }, [masterHeads, headSearch, headFilterCat])

  const handleSaveExpenseHead = (e: React.FormEvent) => {
    e.preventDefault()
    if (!headName.trim()) {
      toast('Please enter the expense head name')
      return
    }

    const newEntry = {
      id: `head-${Date.now()}`,
      name: headName.trim(),
      category: headCategory,
      singleLimit: Number(headSingleLimit) || 0,
      monthlyCap: Number(headMonthlyCap) || 0,
      receiptMandatory: headReceiptMandatory,
      status: headStatus,
      applicableTo: headApplicableTo,
      notes: headNotes.trim() || undefined,
    }

    setMasterHeads((prev) => [newEntry, ...prev])
    toast(`Expense head "${headName.trim()}" added successfully`)
    setShowHeadModal(false)
    setHeadName('')
    setHeadNotes('')
  }

  // Totals
  const officeTotal = useMemo(
    () => officeExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [officeExpenses]
  )

  const fieldTotal = useMemo(
    () => fieldExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [fieldExpenses]
  )

  const otherTotal = useMemo(
    () => otherExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [otherExpenses]
  )

  const pendingApprovalsCount = useMemo(
    () => approvals.filter((a) => a.status === 'Pending').length,
    [approvals]
  )

  // Report calculations
  const reportTotals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        office: acc.office + row.office,
        field: acc.field + row.field,
        other: acc.other + row.other,
        total: acc.total + row.total,
        claims: acc.claims + row.claims,
      }),
      { office: 0, field: 0, other: 0, total: 0, claims: 0 }
    )
  }, [reportData])

  // Approval actions
  const handleApproveClaim = (id: string, claimNo: string) => {
    setApprovals((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Approved' } : c))
    )
    toast(`Claim ${claimNo} approved and forwarded to next stage!`, 'success')
  }

  const handleRejectClaim = (id: string, claimNo: string) => {
    setApprovals((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Rejected' } : c))
    )
    toast(`Claim ${claimNo} rejected / returned for clarification.`, 'info')
  }

  // Export report to CSV
  const handleExportReport = () => {
    const headers = [
      'S.N.',
      'Expense Head Name',
      'Office (INR)',
      'Field Staff (INR)',
      'Other Staff (INR)',
      'Total Amount (INR)',
      'No. of Claims',
    ]
    const rows = reportData.map((r) => [
      String(r.sn),
      r.head,
      String(r.office),
      String(r.field),
      String(r.other),
      String(r.total),
      String(r.claims),
    ])
    rows.push([
      'TOTAL',
      'Total Amount (INR)',
      String(reportTotals.office),
      String(reportTotals.field),
      String(reportTotals.other),
      String(reportTotals.total),
      String(reportTotals.claims),
    ])
    downloadCsv(`Expense_Summary_Report_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('Expense summary report downloaded successfully!')
  }

  // Handle New Claim Submission (Image 2)
  const handleSubmitNewClaim = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAmount || isNaN(Number(newAmount))) {
      toast('Please enter a valid amount', 'info')
      return
    }
    if (!newPurpose.trim()) {
      toast('Please enter purpose / description', 'info')
      return
    }

    const newItem: ExpenseClaimItem = {
      id: `exp-${Date.now()}`,
      date: new Date(newExpenseDate).toLocaleDateString('en-GB'),
      category: newHead,
      purpose: newPurpose.trim(),
      vendorRef: newVendorRef.trim() || 'N/A',
      amount: Number(newAmount),
      paymentMode: newPaymentMode,
      receiptName: newAttachedFile || 'Receipt_voucher.pdf',
      remarks: '-',
    }

    if (claimSegment === 'Office') {
      setOfficeExpenses((prev) => [newItem, ...prev])
      setActiveTab('office')
    } else if (claimSegment === 'Field') {
      newItem.travelMode = 'Intercity Travel'
      newItem.km = 45
      newItem.route = 'Bewar to Site'
      setFieldExpenses((prev) => [newItem, ...prev])
      setActiveTab('field')
    } else {
      setOtherExpenses((prev) => [newItem, ...prev])
      setActiveTab('other')
    }

    toast(`Expense claim for ₹${Number(newAmount).toLocaleString('en-IN')} submitted successfully!`, 'success')
    setShowClaimModal(false)
  }

  // Handle Adding an item to Office or Field claim table
  const handleAddInlineRow = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rowAmount || isNaN(Number(rowAmount))) {
      toast('Please enter a valid amount', 'info')
      return
    }

    const newItem: ExpenseClaimItem = {
      id: `item-${Date.now()}`,
      date: new Date(rowDate).toLocaleDateString('en-GB'),
      category: rowCategory,
      purpose: rowPurpose.trim() || 'Official expense',
      vendorRef: rowVendor.trim() || 'REF-' + Date.now().toString().slice(-6),
      amount: Number(rowAmount),
      paymentMode: rowPaymentMode,
      receiptName: rowFile || 'Bill_Receipt.pdf',
      remarks: rowRemarks.trim() || '-',
    }

    if (rowForTab === 'office') {
      setOfficeExpenses((prev) => [...prev, newItem])
      toast('Added new expense item to Office Claim')
    } else {
      newItem.route = rowRoute || 'Local Field Visit'
      newItem.travelMode = rowCategory
      newItem.km = rowKm || '-'
      setFieldExpenses((prev) => [...prev, newItem])
      toast('Added new expense item to Field Claim')
    }

    setShowAddRowModal(false)
    setRowPurpose('')
    setRowAmount('')
    setRowVendor('')
  }

  const handleDeleteOfficeRow = (id: string) => {
    setOfficeExpenses((prev) => prev.filter((r) => r.id !== id))
    toast('Removed expense row')
  }

  const handleDeleteFieldRow = (id: string) => {
    setFieldExpenses((prev) => prev.filter((r) => r.id !== id))
    toast('Removed expense row')
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-4">
      {/* ── BREADCRUMB ── */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/hrms" className="hover:text-[#0066FF] transition-colors">
          HR &amp; Administration
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          Staff &amp; Office Expense Management
        </span>
        {activeTab === 'office' && (
          <>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-[#0066FF]">Office Expense Claim</span>
          </>
        )}
        {activeTab === 'field' && (
          <>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-[#0066FF]">Travel &amp; Field Expense Claim</span>
          </>
        )}
        {activeTab === 'reports' && (
          <>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-[#0066FF]">Expense Summary Report</span>
          </>
        )}
      </div>

      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-sm shrink-0">
            {activeTab === 'office' ? (
              <ClipboardList size={22} />
            ) : activeTab === 'field' ? (
              <Luggage size={22} />
            ) : activeTab === 'reports' ? (
              <BarChart3 size={22} />
            ) : (
              <Wallet size={22} />
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
              {activeTab === 'office'
                ? 'Office Expense Claim – General Expenses'
                : activeTab === 'field'
                  ? 'Travel & Field Expense Claim'
                  : activeTab === 'reports'
                    ? 'Expense Summary Report – Company Expenses'
                    : 'Staff & Office Expense Management'}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              {activeTab === 'office'
                ? 'Office utilities, courier, speed post, mobile recharge and stationary claims.'
                : activeTab === 'field'
                  ? 'Field engineer travel, fuel, daily allowance, toll and stay reimbursement.'
                  : activeTab === 'reports'
                    ? 'Comprehensive department and expense head breakdown for monthly audits.'
                    : 'Manage daily expenses, approvals, payments and expense reports for Office, Field and Other Staff.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'reports' && (
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Download size={14} className="text-[#0066FF]" />
              <span>Export</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowClaimModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS (MATCHING IMAGE 01) ── */}
      <div className="overflow-x-auto scroll-thin pb-1">
        <div className="inline-flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs min-w-full sm:min-w-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'my-claims', label: 'My Claims' },
            { id: 'office', label: 'Office Expenses' },
            { id: 'field', label: 'Field Expenses' },
            { id: 'other', label: 'Other Staff Expenses' },
            { id: 'approvals', label: 'Approvals', badge: pendingApprovalsCount },
            { id: 'payments', label: 'Payments' },
            { id: 'reports', label: 'Reports & MIS' },
            { id: 'master', label: 'Expense Master' },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                )}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                      isActive ? 'bg-white text-[#0066FF]' : 'bg-red-500 text-white'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW (MATCHING IMAGE 01) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Top 6 KPI Cards matching Image 01 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Total Claims */}
            <div className="rounded-xl border border-blue-100 bg-[#F4F8FD] p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-[#0066FF] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total Claims</span>
                <span className="text-[20px] font-bold text-slate-900 leading-tight">256</span>
              </div>
            </div>

            {/* Card 2: Approved Claims */}
            <div className="rounded-xl border border-emerald-100 bg-[#F2FBF6] p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Approved Claims</span>
                <span className="text-[20px] font-bold text-emerald-600 leading-tight">198</span>
              </div>
            </div>

            {/* Card 3: Pending for Approval */}
            <div className="rounded-xl border border-amber-100 bg-[#FEF9EE] p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Pending for Approval</span>
                <span className="text-[20px] font-bold text-amber-600 leading-tight">36</span>
              </div>
            </div>

            {/* Card 4: Total Claim Amount */}
            <div className="rounded-xl border border-purple-100 bg-[#F9F5FE] p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                <IndianRupee size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total Claim Amount</span>
                <span className="text-[18px] font-bold text-purple-700 leading-tight">₹ 8,72,450</span>
              </div>
            </div>

            {/* Card 5: Total Paid Amount */}
            <div className="rounded-xl border border-teal-100 bg-[#F0FDF8] p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-600 flex items-center justify-center shrink-0">
                <Banknote size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total Paid Amount</span>
                <span className="text-[18px] font-bold text-teal-700 leading-tight">₹ 7,95,300</span>
              </div>
            </div>

            {/* Card 6: Rejected / Returned */}
            <div className="rounded-xl border border-rose-100 bg-[#FFF5F6] p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Rejected / Returned</span>
                <span className="text-[20px] font-bold text-rose-600 leading-tight">22</span>
              </div>
            </div>
          </div>

          {/* Middle Two Panels: Expense Summary Donut & Expense Head Wise Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Card: Expense Summary (Current Month) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-[#0066FF]" />
                <h2 className="text-[14px] font-bold text-slate-900">
                  Expense Summary (Current Month)
                </h2>
              </div>

              <div className="my-auto py-2 flex flex-col sm:flex-row items-center justify-between gap-5">
                {/* SVG Donut Chart */}
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                    {/* Background track */}
                    <circle cx="70" cy="70" r="58" fill="none" stroke="#F8FAFC" strokeWidth="20" />
                    {/* Blue segment: 35% */}
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="#0066FF"
                      strokeWidth="20"
                      strokeDasharray="125.05 364.42"
                      strokeDashoffset="0"
                    />
                    {/* Green segment: 46% */}
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="20"
                      strokeDasharray="165.14 364.42"
                      strokeDashoffset="-127.55"
                    />
                    {/* Amber segment: 12% */}
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="20"
                      strokeDasharray="41.23 364.42"
                      strokeDashoffset="-295.18"
                    />
                    {/* Purple segment: 7% */}
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="20"
                      strokeDasharray="23.01 364.42"
                      strokeDashoffset="-338.92"
                    />
                  </svg>
                  {/* Center Text inside Donut - neatly formatted on 3 lines */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-3">
                    <span className="text-[17px] sm:text-[18px] font-bold text-slate-900 leading-tight">
                      ₹ 8,72,450
                    </span>
                    <span className="text-[11px] font-medium text-slate-700 leading-tight mt-1">
                      Total Claim
                    </span>
                    <span className="text-[11px] font-medium text-slate-700 leading-tight">
                      Amount
                    </span>
                  </div>
                </div>

                {/* Legend list matching Image 01 with divider lines */}
                <div className="flex-1 w-full space-y-0 text-[12px]">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-[3px] bg-[#0066FF] shrink-0" />
                      <span className="font-semibold text-slate-800 text-[12.5px]">Office Expenses</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-bold text-slate-900 text-[12.5px] w-8">35%</span>
                      <span className="font-semibold text-slate-900 text-[12.5px] w-20">₹ 3,05,350</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-[3px] bg-[#10B981] shrink-0" />
                      <span className="font-semibold text-slate-800 text-[12.5px]">Field Staff Expenses</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-bold text-slate-900 text-[12.5px] w-8">46%</span>
                      <span className="font-semibold text-slate-900 text-[12.5px] w-20">₹ 4,01,420</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-[3px] bg-[#F59E0B] shrink-0" />
                      <span className="font-semibold text-slate-800 text-[12.5px]">Other Staff Expenses</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-bold text-slate-900 text-[12.5px] w-8">12%</span>
                      <span className="font-semibold text-slate-900 text-[12.5px] w-20">₹ 1,04,380</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-[3px] bg-[#8B5CF6] shrink-0" />
                      <span className="font-semibold text-slate-800 text-[12.5px]">Others</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-bold text-slate-900 text-[12.5px] w-8">7%</span>
                      <span className="font-semibold text-slate-900 text-[12.5px] w-20">₹ 61,300</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Expense Head Wise Summary (Top 8) matching Image 01 */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#0066FF]" />
                    <h2 className="text-[14px] font-bold text-slate-900">
                      Expense Head Wise Summary (Top 8)
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="text-[12px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
                  >
                    View All (24)
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">S.N.</th>
                        <th className="py-2.5 px-3">Expense Head Name</th>
                        <th className="py-2.5 px-3 text-center">No. of Claims</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3 text-center">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {TOP_EXPENSE_HEADS.map((item) => (
                        <tr key={item.sn} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500 font-medium">{item.sn}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{item.claims}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {item.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">
                            {item.percent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[11.5px] text-slate-500">
                <span>Top 8 heads account for 80.5% of total claims</span>
                <span className="font-semibold text-slate-700">Combined: ₹ 7,02,140</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: MY CLAIMS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'my-claims' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">My Expense Claims History</h2>
              <p className="text-[12px] text-slate-500">Track claim submissions, vouchers and approval statuses.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowClaimModal(true)}
              className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-bold shadow-2xs"
            >
              <Plus size={14} /> New Claim Entry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Access Card: Office Expenses */}
            <div
              onClick={() => setActiveTab('office')}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-[#0066FF] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0066FF] group-hover:bg-[#0066FF] group-hover:text-white transition-colors flex items-center justify-center">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors">
                      Office Expense Claim
                    </h3>
                    <span className="text-[11px] text-slate-500">General office expenses, courier, recharge &amp; supplies</span>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  ₹{officeTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-600">
                <span>{officeExpenses.length} items logged</span>
                <span className="font-semibold text-[#0066FF] flex items-center gap-1">
                  Open Sheet <ChevronRight size={13} />
                </span>
              </div>
            </div>

            {/* Quick Access Card: Field Expenses */}
            <div
              onClick={() => setActiveTab('field')}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-[#0066FF] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                    <Luggage size={18} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Travel &amp; Field Expense Claim
                    </h3>
                    <span className="text-[11px] text-slate-500">Petrol, local auto, intercity travel, hotel stay &amp; TA</span>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ₹{fieldTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-600">
                <span>{fieldExpenses.length} items logged</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  Open Sheet <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: OFFICE EXPENSES (MATCHING IMAGE 04) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'office' && (
        <div className="space-y-4">
          {/* Card 1: Employee Details matching Image 04 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 text-[13px] font-bold text-slate-800">
              <User size={15} className="text-[#0066FF]" />
              <span>Employee Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[12px]">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Employee Name</span>
                <span className="font-bold text-slate-800">{employee.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Employee Code</span>
                <span className="font-bold text-slate-800">{employee.code}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Department</span>
                <span className="font-bold text-slate-800">{employee.department}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Designation</span>
                <span className="font-bold text-slate-800">{employee.designation}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Location</span>
                <span className="font-bold text-slate-800">{employee.location}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Reporting Month</span>
                <div className="h-7.5 px-2.5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between text-[11.5px] font-bold text-slate-700 mt-0.5">
                  <span>{employee.reportingMonth}</span>
                  <Calendar size={13} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Expense Details Table with [+ Add Expense] matching Image 04 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#0066FF]" />
                <h2 className="text-[14px] font-bold text-slate-900">Expense Details</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRowForTab('office')
                  setRowCategory('Speed Post')
                  setShowAddRowModal(true)
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-bold shadow-2xs cursor-pointer"
              >
                <Plus size={14} /> Add Expense
              </button>
            </div>

            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-12">S.No.</th>
                    <th className="py-2.5 px-3">Expense Date</th>
                    <th className="py-2.5 px-3">Expense Category</th>
                    <th className="py-2.5 px-3">Purpose / Description</th>
                    <th className="py-2.5 px-3">Vendor / Reference No.</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Payment Mode</th>
                    <th className="py-2.5 px-3">Bill / Receipt</th>
                    <th className="py-2.5 px-3 text-center">Remarks</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {officeExpenses.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{row.date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11.5px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{row.purpose}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{row.vendorRef}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {row.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                          {row.paymentMode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <a
                          href={`#receipt-${row.id}`}
                          onClick={(e) => {
                            e.preventDefault()
                            toast(`Opening ${row.receiptName}`, 'info')
                          }}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0066FF] hover:underline"
                        >
                          <LinkIcon size={12} />
                          <span className="truncate max-w-[160px]">{row.receiptName}</span>
                        </a>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{row.remarks || '-'}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteOfficeRow(row.id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Claim Amount Banner matching Image 04 */}
            <div className="p-3 bg-[#EAF2FD]/80 border-t border-blue-100 flex items-center justify-end gap-3">
              <span className="text-[13px] font-bold text-slate-700">Total Claim Amount</span>
              <div className="h-8 px-4 rounded-lg bg-[#0066FF] text-white font-extrabold text-[15px] flex items-center justify-center shadow-xs">
                {officeTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Card 3: Metadata & Declaration matching Image 04 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Bill Attached</span>
                <span className="font-bold text-slate-800 text-[13px]">Yes</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Prepared By</span>
                <span className="font-bold text-slate-800 text-[13px]">{employee.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium mb-1">
                  Employee Declaration / Signature
                </span>
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-700 leading-tight">
                  <input
                    type="checkbox"
                    checked={officeDeclaration}
                    onChange={(e) => setOfficeDeclaration(e.target.checked)}
                    className="mt-0.5 rounded text-[#0066FF] focus:ring-[#0066FF]"
                  />
                  <span>
                    I hereby declare that the above expenses are incurred for official work and are true as per bills.
                  </span>
                </label>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Claim Status</span>
                <span className="inline-block mt-0.5 px-3 py-1 rounded-full bg-blue-50 text-[#0066FF] border border-blue-200 font-bold text-[12px]">
                  {officeStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Approval Progress Stepper matching Image 04 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 text-[13px] font-bold text-slate-800">
              <CheckCircle2 size={16} className="text-[#0066FF]" />
              <span>Approval Progress</span>
            </div>

            <div className="relative flex items-center justify-between">
              {/* Connector line */}
              <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

              {/* Step 1: Submitted (Completed) */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[12px] shadow-sm ring-4 ring-white">
                  <Check size={16} strokeWidth={2.5} />
                </div>
                <span className="mt-1.5 text-[12px] font-bold text-slate-800">Submitted</span>
                <span className="text-[10px] text-slate-400">29 Aug 2026, 05:20 PM</span>
              </div>

              {/* Step 2: Senior Verification (Pending) */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-[#0066FF] text-[#0066FF] flex items-center justify-center font-bold text-[11px] shadow-sm ring-4 ring-white">
                  2
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-700">Senior Verification</span>
                <span className="text-[10px] text-amber-600 font-medium">Pending</span>
              </div>

              {/* Step 3: HR Verification */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-[11px] ring-4 ring-white">
                  3
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-500">HR Verification</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>

              {/* Step 4: Admin Approval */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-[11px] ring-4 ring-white">
                  4
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-500">Admin Approval</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>

              {/* Step 5: Finance Payment */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-[11px] ring-4 ring-white">
                  5
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-500">Finance Payment</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: FIELD EXPENSES (MATCHING IMAGE 05) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'field' && (
        <div className="space-y-4">
          {/* Card 1: Employee Details matching Image 05 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 text-[13px] font-bold text-slate-800">
              <User size={15} className="text-[#0066FF]" />
              <span>Employee Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[12px]">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Employee Name</span>
                <span className="font-bold text-slate-800">{employee.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Employee Code</span>
                <span className="font-bold text-slate-800">{employee.code}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Department</span>
                <span className="font-bold text-slate-800">{employee.department}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Designation</span>
                <span className="font-bold text-slate-800">{employee.designation}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Location</span>
                <span className="font-bold text-slate-800">{employee.location}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Reporting Month</span>
                <div className="h-7.5 px-2.5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between text-[11.5px] font-bold text-slate-700 mt-0.5">
                  <span>{employee.reportingMonth}</span>
                  <Calendar size={13} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Travel & Field Expense Details Table with [+ Add Expense] matching Image 05 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#0066FF]" />
                <h2 className="text-[14px] font-bold text-slate-900">Travel &amp; Field Expense Details</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRowForTab('field')
                  setRowCategory('Petrol / Fuel')
                  setShowAddRowModal(true)
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-bold shadow-2xs cursor-pointer"
              >
                <Plus size={14} /> Add Expense
              </button>
            </div>

            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-12">S.No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Route / Place Visited</th>
                    <th className="py-2.5 px-3">Purpose</th>
                    <th className="py-2.5 px-3">Travel Mode</th>
                    <th className="py-2.5 px-3 text-center">KM</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Payment Mode</th>
                    <th className="py-2.5 px-3">Supporting Document</th>
                    <th className="py-2.5 px-3 text-center">Remarks</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {fieldExpenses.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{row.date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{row.route}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{row.purpose}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                          {row.travelMode || row.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600">{row.km}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {row.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                          {row.paymentMode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <a
                          href={`#receipt-${row.id}`}
                          onClick={(e) => {
                            e.preventDefault()
                            toast(`Opening ${row.receiptName}`, 'info')
                          }}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0066FF] hover:underline"
                        >
                          <LinkIcon size={12} />
                          <span className="truncate max-w-[150px]">{row.receiptName}</span>
                        </a>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-medium">{row.remarks || '-'}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteFieldRow(row.id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Claim Amount Banner matching Image 05 */}
            <div className="p-3 bg-[#EAF2FD]/80 border-t border-blue-100 flex items-center justify-end gap-3">
              <span className="text-[13px] font-bold text-slate-700">Total Claim Amount</span>
              <div className="h-8 px-4 rounded-lg bg-[#0066FF] text-white font-extrabold text-[15px] flex items-center justify-center shadow-xs">
                {fieldTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Card 3: Metadata & Declaration matching Image 05 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Bill Attached</span>
                <span className="font-bold text-slate-800 text-[13px]">Yes</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Prepared By</span>
                <span className="font-bold text-slate-800 text-[13px]">{employee.name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium mb-1">
                  Employee Declaration / Signature
                </span>
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-700 leading-tight">
                  <input
                    type="checkbox"
                    checked={fieldDeclaration}
                    onChange={(e) => setFieldDeclaration(e.target.checked)}
                    className="mt-0.5 rounded text-[#0066FF] focus:ring-[#0066FF]"
                  />
                  <span>
                    I hereby declare that the above expenses are incurred for official work and are true as per bills.
                  </span>
                </label>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Claim Status</span>
                <span className="inline-block mt-0.5 px-3 py-1 rounded-full bg-blue-50 text-[#0066FF] border border-blue-200 font-bold text-[12px]">
                  {fieldStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Approval Progress Stepper matching Image 05 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 text-[13px] font-bold text-slate-800">
              <CheckCircle2 size={16} className="text-[#0066FF]" />
              <span>Approval Progress</span>
            </div>

            <div className="relative flex items-center justify-between">
              {/* Connector line */}
              <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

              {/* Step 1: Submitted (Completed) */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[12px] shadow-sm ring-4 ring-white">
                  <Check size={16} strokeWidth={2.5} />
                </div>
                <span className="mt-1.5 text-[12px] font-bold text-slate-800">Submitted</span>
                <span className="text-[10px] text-slate-400">16 Aug 2026, 06:05 PM</span>
              </div>

              {/* Step 2: Senior Verification (Pending) */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-[#0066FF] text-[#0066FF] flex items-center justify-center font-bold text-[11px] shadow-sm ring-4 ring-white">
                  2
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-700">Senior Verification</span>
                <span className="text-[10px] text-amber-600 font-medium">Pending</span>
              </div>

              {/* Step 3: HR Verification */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-[11px] ring-4 ring-white">
                  3
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-500">HR Verification</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>

              {/* Step 4: Admin Approval */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-[11px] ring-4 ring-white">
                  4
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-500">Admin Approval</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>

              {/* Step 5: Finance Payment */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-[11px] ring-4 ring-white">
                  5
                </div>
                <span className="mt-1.5 text-[12px] font-semibold text-slate-500">Finance Payment</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: OTHER STAFF EXPENSES */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'other' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">Other Staff &amp; Branch Consumables</h2>
              <p className="text-[12px] text-slate-500">Pantry, cleaning, staff welfare, tea and branch contingency vouchers.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-700">Total:</span>
              <span className="h-7.5 px-3 rounded-md bg-[#0066FF] text-white font-bold text-[13px] flex items-center">
                ₹{otherTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-12">S.No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Purpose / Item</th>
                    <th className="py-2.5 px-3">Vendor / Ref</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Payment Mode</th>
                    <th className="py-2.5 px-3">Receipt Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {otherExpenses.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{row.category}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{row.purpose}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{row.vendorRef}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {row.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                          {row.paymentMode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0066FF]">
                          <LinkIcon size={12} /> {row.receiptName}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 6: APPROVALS QUEUE (12 PENDING) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-slate-900">Manager &amp; HR Verification Queue</h2>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                  {pendingApprovalsCount} Action Items
                </span>
              </div>
              <p className="text-[12px] text-slate-500">
                Review employee receipts, verify travel routes, check policy compliance, and approve for disbursement.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3">Claim #</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Submitted Date</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Approval Stage</th>
                    <th className="py-2.5 px-3 text-center">Receipt</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {approvals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#0066FF] whitespace-nowrap">{item.claimNo}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{item.empName}</div>
                        <div className="text-[11px] text-slate-400">{item.empCode} · {item.department}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-semibold',
                            item.claimType === 'Office'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.claimType === 'Field'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                          )}
                        >
                          {item.claimType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11.5px]">{item.submittedDate}</td>
                      <td className="py-2.5 px-3 text-center font-medium">{item.itemsCount}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          {item.stage} Verification
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <a
                          href={`#receipt-${item.id}`}
                          onClick={(e) => {
                            e.preventDefault()
                            toast(`Viewing ${item.receiptName}`, 'info')
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] hover:underline"
                        >
                          <Paperclip size={12} /> View
                        </a>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.status === 'Pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveClaim(item.id, item.claimNo)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectClaim(item.id, item.claimNo)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-bold',
                              item.status === 'Approved' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                            )}
                          >
                            {item.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 7: PAYMENTS DISBURSEMENT */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">Finance Payment Disbursement Register</h2>
              <p className="text-[12px] text-slate-500">
                198 approved vouchers settled via bank transfer (NEFT/UPI). Total Disbursed: ₹ 7,95,300.
              </p>
            </div>
            <span className="text-[12px] font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Total Paid: ₹ 7,95,300
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Employee Beneficiary</th>
                    <th className="py-2.5 px-3">Account Details</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3">UTR Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Paid Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {[
                    { v: 'VCH-2026-0811', name: 'Harsh Pratap Singh', acc: 'Axis Bank ··9412', mode: 'UPI', utr: 'UTR-589110003236', amt: 5647, date: '28 Aug 2026' },
                    { v: 'VCH-2026-0805', name: 'Rajesh Nair', acc: 'HDFC Bank ··1104', mode: 'NEFT', utr: 'N082619472611', amt: 3820, date: '27 Aug 2026' },
                    { v: 'VCH-2026-0798', name: 'Vikram Joshi', acc: 'SBI ··6782', mode: 'NEFT', utr: 'N082619472605', amt: 5400, date: '25 Aug 2026' },
                    { v: 'VCH-2026-0791', name: 'Pooja Deshmukh', acc: 'ICICI Bank ··3301', mode: 'UPI', utr: 'UTR-441098223114', amt: 2200, date: '24 Aug 2026' },
                    { v: 'VCH-2026-0785', name: 'Amitabh Sharma', acc: 'Kotak Bank ··0918', mode: 'UPI', utr: 'UTR-331009182741', amt: 980, date: '22 Aug 2026' },
                  ].map((row) => (
                    <tr key={row.v} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-[#0066FF]">{row.v}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.acc}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-bold">
                          {row.mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{row.utr}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        ₹{row.amt.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{row.date}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          Disbursed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 8: REPORTS & MIS (MATCHING IMAGE 03) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Filter Bar matching Image 03 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end text-[12px]">
              {/* From Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">From Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reportFromDate}
                    onChange={(e) => setReportFromDate(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                  />
                  <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                </div>
              </div>

              {/* To Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">To Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reportToDate}
                    onChange={(e) => setReportToDate(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                  />
                  <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                </div>
              </div>

              {/* Employee Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee Type</label>
                <select
                  value={reportEmpType}
                  onChange={(e) => setReportEmpType(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  <option value="All (Office/Field/Other)">All (Office/Field/Other)</option>
                  <option value="Office Staff">Office Staff</option>
                  <option value="Field Staff">Field Staff</option>
                  <option value="Other Staff">Other Staff</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={reportDept}
                  onChange={(e) => setReportDept(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  <option value="All Departments">All Departments</option>
                  <option value="WLA-Support">WLA-Support</option>
                  <option value="Operations">Operations</option>
                  <option value="Legal & Compliance">Legal &amp; Compliance</option>
                  <option value="Finance">Finance</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>

              {/* Expense Head */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Expense Head</label>
                <select
                  value={reportHead}
                  onChange={(e) => setReportHead(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  <option value="All (24 Heads)">All (24 Heads)</option>
                  {ALL_EXPENSE_HEADS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Button */}
              <div>
                <button
                  type="button"
                  onClick={() => toast('Report filters applied!')}
                  className="w-full h-9 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-[12.5px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Search size={14} /> Search
                </button>
              </div>

              {/* Reset Button */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setReportFromDate('01.08.2026')
                    setReportToDate('31.08.2026')
                    setReportEmpType('All (Office/Field/Other)')
                    setReportDept('All Departments')
                    setReportHead('All (24 Heads)')
                    setReportData(EXPENSE_SUMMARY_REPORT_DATA)
                    toast('Filters reset')
                  }}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[12.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Table matching Image 03 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/80 text-[11.5px] font-bold text-slate-800 border-b border-blue-100">
                    <th className="py-3 px-3 text-center w-12 border-r border-blue-100/60">S.N.</th>
                    <th className="py-3 px-3.5 border-r border-blue-100/60">Expense Head Name</th>
                    <th className="py-3 px-3 text-right border-r border-blue-100/60">Office (₹)</th>
                    <th className="py-3 px-3 text-right border-r border-blue-100/60">Field Staff (₹)</th>
                    <th className="py-3 px-3 text-right border-r border-blue-100/60">Other Staff (₹)</th>
                    <th className="py-3 px-3.5 text-right font-extrabold border-r border-blue-100/60 bg-blue-50/50">
                      Total Amount (₹)
                    </th>
                    <th className="py-3 px-3 text-center w-28">No. of Claims</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reportData.map((row) => (
                    <tr key={row.sn} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-500 font-medium border-r border-slate-100">
                        {row.sn}
                      </td>
                      <td className="py-2 px-3.5 font-semibold text-slate-800 border-r border-slate-100">
                        {row.head}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700 border-r border-slate-100">
                        {row.office > 0 ? row.office.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700 border-r border-slate-100">
                        {row.field > 0 ? row.field.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700 border-r border-slate-100">
                        {row.other > 0 ? row.other.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-2 px-3.5 text-right font-extrabold text-slate-900 border-r border-slate-100 bg-blue-50/20">
                        {row.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {row.claims}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Total Blue Row matching Image 03 */}
                  <tr className="bg-[#DCEBFD] font-extrabold text-slate-900 text-[12.5px] border-t-2 border-blue-300">
                    <td colSpan={2} className="py-2.5 px-3.5 text-center font-extrabold text-slate-900 border-r border-blue-200">
                      Total Amount (₹)
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-blue-200">
                      {reportTotals.office.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-blue-200">
                      {reportTotals.field.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-blue-200">
                      {reportTotals.other.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-black text-[#0066FF] border-r border-blue-200">
                      {reportTotals.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900">
                      {reportTotals.claims}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 9: EXPENSE MASTER */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">Expense Master &amp; Policy Limit Setup</h2>
              <p className="text-[12px] text-slate-500">
                Configure expense heads, daily allowances, reimbursement caps, and mandatory receipt rules.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expense heads..."
                  value={headSearch}
                  onChange={(e) => setHeadSearch(e.target.value)}
                  className="h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>
              <select
                value={headFilterCat}
                onChange={(e) => setHeadFilterCat(e.target.value)}
                className="h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0066FF] bg-white font-medium text-slate-700"
              >
                <option value="All Categories">All Categories</option>
                <option value="Office Administration">Office Administration</option>
                <option value="Travel & Field">Travel & Field</option>
                <option value="Staff Welfare">Staff Welfare</option>
                <option value="IT & Telecommunications">IT & Telecommunications</option>
                <option value="Logistics & Courier">Logistics & Courier</option>
                <option value="Repair & Maintenance">Repair & Maintenance</option>
              </select>
              <button
                type="button"
                onClick={() => setShowHeadModal(true)}
                className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Expense Head
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-[#EAF2FD]/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Expense Head</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Applicable To</th>
                    <th className="py-2.5 px-3 text-right">Max Single Limit (₹)</th>
                    <th className="py-2.5 px-3 text-right">Monthly Cap (₹)</th>
                    <th className="py-2.5 px-3 text-center">Receipt Mandatory</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMasterHeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-[13px]">
                        No matching expense heads found.
                      </td>
                    </tr>
                  ) : (
                    filteredMasterHeads.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {item.name}
                          {item.notes && (
                            <span className="block text-[10.5px] text-slate-400 font-normal">
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium text-[11.5px]">
                          {item.applicableTo}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          ₹ {item.singleLimit.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          ₹ {item.monthlyCap.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10.5px] font-bold',
                              item.receiptMandatory
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-slate-600 bg-slate-100'
                            )}
                          >
                            {item.receiptMandatory ? 'Yes' : 'Optional'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newStatus = item.status === 'Active' ? 'Inactive' : 'Active'
                              setMasterHeads((prev) =>
                                prev.map((h) => (h.id === item.id ? { ...h, status: newStatus } : h))
                              )
                              toast(`${item.name} marked as ${newStatus}`)
                            }}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer transition-colors',
                              item.status === 'Active'
                                ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            )}
                          >
                            {item.status}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setMasterHeads((prev) => prev.filter((h) => h.id !== item.id))
                              toast(`Removed "${item.name}"`)
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Delete head"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[11.5px] text-slate-500">
              <span>Showing {filteredMasterHeads.length} of {masterHeads.length} policy heads</span>
              <span className="font-semibold text-slate-700">Company Standard Cap: ₹ 50,000 / month</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 1: EXPENSE CLAIM ENTRY (MATCHING IMAGE 02) */}
      {/* ────────────────────────────────────────────────────────── */}
      {showClaimModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowClaimModal(false)}
        >
          <div className="w-full max-w-[840px] my-6 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header matching Image 02 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-slate-900 leading-tight">Expense Claim Entry</h2>
                  <p className="text-[11.5px] text-slate-500">Record a new expense claim voucher with bills</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewClaim} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scroll-thin">
              {/* Segment Tabs matching Image 02 */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {(['Office', 'Field', 'Other'] as const).map((seg) => {
                  const label =
                    seg === 'Office'
                      ? 'Office Expenses'
                      : seg === 'Field'
                        ? 'Field Staff Expenses'
                        : 'Other Staff Expenses'
                  const isSelected = claimSegment === seg
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setClaimSegment(seg)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer',
                        isSelected ? 'bg-[#0066FF] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Card 1: Employee Details matching Image 02 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-[12.5px] font-bold text-slate-800">
                  <User size={14} className="text-[#0066FF]" />
                  <span>Employee Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[12px]">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Employee Name</span>
                    <span className="font-bold text-slate-800">{employee.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Employee Code</span>
                    <span className="font-bold text-slate-800">{employee.code}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Department</span>
                    <span className="font-bold text-slate-800">{employee.department}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Designation</span>
                    <span className="font-bold text-slate-800">{employee.designation}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Location / HQ</span>
                    <span className="font-bold text-slate-800">{employee.location}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Reporting Month</span>
                    <div className="h-7.5 px-2.5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between text-[11.5px] font-bold text-slate-700 mt-0.5">
                      <span>{employee.reportingMonth}</span>
                      <Calendar size={13} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Expense Details matching Image 02 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-[12.5px] font-bold text-slate-800">
                  <FileText size={14} className="text-[#0066FF]" />
                  <span>Expense Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left form fields (8 cols) */}
                  <div className="md:col-span-8 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                          Expense Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={newExpenseDate}
                            onChange={(e) => setNewExpenseDate(e.target.value)}
                            className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                          Amount (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          placeholder="e.g. 1250"
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-bold text-slate-900 outline-none focus:border-[#0066FF]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                          Expense Head <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newHead}
                          onChange={(e) => setNewHead(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                        >
                          {masterHeads.map((head) => (
                            <option key={head.id} value={head.name}>
                              {head.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                          Payment Mode <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newPaymentMode}
                          onChange={(e) => setNewPaymentMode(e.target.value as any)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                        >
                          <option value="UPI">UPI</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="Net Banking">Net Banking</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                        Purpose / Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newPurpose}
                        onChange={(e) => setNewPurpose(e.target.value)}
                        placeholder="e.g. Client site visit - Bewar to Mainpuri"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                        Vendor / Reference No.
                      </label>
                      <input
                        type="text"
                        value={newVendorRef}
                        onChange={(e) => setNewVendorRef(e.target.value)}
                        placeholder="e.g. UTR - 589110003236"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-800 outline-none focus:border-[#0066FF]"
                      />
                    </div>
                  </div>

                  {/* Right: Bill / Receipt Upload Zone (4 cols) matching Image 02 */}
                  <div className="md:col-span-4 flex flex-col">
                    <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                      Bill / Receipt <span className="text-red-500">*</span>
                    </label>

                    <div
                      onClick={() => {
                        const fakeName = `Bill_${Date.now().toString().slice(-4)}.pdf`
                        setNewAttachedFile(fakeName)
                        toast(`Attached ${fakeName}`)
                      }}
                      className="flex-1 min-h-[140px] border-2 border-dashed border-slate-300 hover:border-[#0066FF] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/20 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0066FF] group-hover:bg-[#0066FF] group-hover:text-white flex items-center justify-center mb-2 transition-colors">
                        <Paperclip size={18} />
                      </div>
                      <span className="text-[12.5px] font-bold text-slate-700">Upload File</span>
                      <span className="text-[10.5px] text-slate-400 mt-0.5">PDF / JPG / PNG (Max 5 MB)</span>
                    </div>

                    {/* Attached file preview */}
                    {newAttachedFile && (
                      <div className="mt-2.5 p-2 rounded-lg bg-blue-50/60 border border-blue-200 flex items-center justify-between text-[11.5px]">
                        <div className="flex items-center gap-1.5 truncate pr-2 text-[#0066FF] font-semibold">
                          <LinkIcon size={12} className="shrink-0" />
                          <span className="truncate">{newAttachedFile}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewAttachedFile(null)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                          title="Remove file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Employee Declaration matching Image 02 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100 text-[12.5px] font-bold text-slate-800">
                  <CheckCircle2 size={14} className="text-[#0066FF]" />
                  <span>Employee Declaration</span>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={newDeclaration}
                    onChange={(e) => setNewDeclaration(e.target.checked)}
                    className="mt-0.5 rounded text-[#0066FF] focus:ring-[#0066FF]"
                    required
                  />
                  <span>
                    I hereby declare that the above expenses are incurred for official work and are true as per bills.
                  </span>
                </label>
              </div>

              {/* Action Buttons matching Image 02 */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    toast('Draft saved successfully', 'info')
                    setShowClaimModal(false)
                  }}
                  className="h-9 px-4 rounded-lg border border-[#0066FF] text-[#0066FF] hover:bg-blue-50/50 bg-white text-[12.5px] font-semibold transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  className="h-9 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-bold shadow-sm transition-all cursor-pointer"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: INLINE ADD EXPENSE ROW (FOR OFFICE OR FIELD SHEET) */}
      {/* ────────────────────────────────────────────────────────── */}
      {showAddRowModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={(e) => e.target === e.currentTarget && setShowAddRowModal(false)}
        >
          <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#0066FF]" />
                <h3 className="text-[15px] font-bold text-slate-900">
                  Add Expense to {rowForTab === 'office' ? 'Office' : 'Field'} Claim
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddInlineRow} className="space-y-3 text-[12px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={rowDate}
                    onChange={(e) => setRowDate(e.target.value)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                    {rowForTab === 'office' ? 'Expense Category' : 'Travel Mode'}
                  </label>
                  <select
                    value={rowCategory}
                    onChange={(e) => setRowCategory(e.target.value)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                  >
                    {rowForTab === 'office' ? (
                      <>
                        <option value="Speed Post">Speed Post</option>
                        <option value="Recharge">Recharge</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Courier">Courier</option>
                        <option value="Stationery">Stationery</option>
                        <option value="Office Utilities">Office Utilities</option>
                      </>
                    ) : (
                      <>
                        <option value="Petrol / Fuel">Petrol / Fuel</option>
                        <option value="Local Travel">Local Travel (Auto/Taxi)</option>
                        <option value="Intercity Travel">Intercity Travel</option>
                        <option value="Accommodation">Accommodation (Hotel)</option>
                        <option value="Daily Allowance (DA)">Daily Allowance (DA)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {rowForTab === 'field' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Route / Place Visited</label>
                    <input
                      type="text"
                      placeholder="e.g. Bewar to Mainpuri"
                      value={rowRoute}
                      onChange={(e) => setRowRoute(e.target.value)}
                      className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Distance (KM)</label>
                    <input
                      type="text"
                      placeholder="e.g. 32"
                      value={rowKm}
                      onChange={(e) => setRowKm(e.target.value)}
                      className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Purpose / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Site Visit & Coordination"
                  value={rowPurpose}
                  onChange={(e) => setRowPurpose(e.target.value)}
                  className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={rowAmount}
                    onChange={(e) => setRowAmount(e.target.value)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 font-bold text-slate-900 outline-none focus:border-[#0066FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={rowPaymentMode}
                    onChange={(e) => setRowPaymentMode(e.target.value as any)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Vendor / Reference</label>
                  <input
                    type="text"
                    placeholder="UTR / Bill Ref"
                    value={rowVendor}
                    onChange={(e) => setRowVendor(e.target.value)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Receipt File Name</label>
                  <input
                    type="text"
                    value={rowFile}
                    onChange={(e) => setRowFile(e.target.value)}
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  value={rowRemarks}
                  onChange={(e) => setRowRemarks(e.target.value)}
                  className="w-full h-8.5 px-3 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="h-8.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold"
                >
                  Add Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: ADD EXPENSE HEAD (MASTER SETUP) */}
      {/* ────────────────────────────────────────────────────────── */}
      {showHeadModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowHeadModal(false)}
        >
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0066FF] text-white flex items-center justify-center font-bold shadow-sm">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">Add New Expense Head</h3>
                  <p className="text-[11.5px] text-slate-500">
                    Configure expense classification, approval rules & reimbursement caps
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHeadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveExpenseHead} className="p-5 space-y-4">
              {/* Head Name */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Expense Head Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Dinner & Refreshments, Generator Fuel, etc."
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[#0066FF] font-medium"
                />
              </div>

              {/* Category & Applicable To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={headCategory}
                    onChange={(e) => setHeadCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[#0066FF] bg-white font-medium text-slate-800"
                  >
                    <option value="Office Administration">Office Administration</option>
                    <option value="Travel & Field">Travel & Field</option>
                    <option value="Staff Welfare">Staff Welfare</option>
                    <option value="IT & Telecommunications">IT & Telecommunications</option>
                    <option value="Logistics & Courier">Logistics & Courier</option>
                    <option value="Repair & Maintenance">Repair & Maintenance</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Applicable To
                  </label>
                  <select
                    value={headApplicableTo}
                    onChange={(e) => setHeadApplicableTo(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[#0066FF] bg-white font-medium text-slate-800"
                  >
                    <option value="All Employees">All Employees</option>
                    <option value="Field Staff Only">Field Staff Only</option>
                    <option value="Office Staff Only">Office Staff Only</option>
                    <option value="Support & Operations">Support & Operations</option>
                    <option value="Management Only">Management Only</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Max Single Limit (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[12px]">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      required
                      placeholder="3000"
                      value={headSingleLimit}
                      onChange={(e) => setHeadSingleLimit(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 rounded-lg border border-slate-200 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[#0066FF] font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Monthly Cap (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[12px]">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      required
                      placeholder="25000"
                      value={headMonthlyCap}
                      onChange={(e) => setHeadMonthlyCap(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 rounded-lg border border-slate-200 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[#0066FF] font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Compliance & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Receipt / Voucher Rule
                  </label>
                  <div className="flex items-center gap-4 text-[12px]">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="headReceipt"
                        checked={headReceiptMandatory}
                        onChange={() => setHeadReceiptMandatory(true)}
                        className="accent-[#0066FF]"
                      />
                      Mandatory
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="headReceipt"
                        checked={!headReceiptMandatory}
                        onChange={() => setHeadReceiptMandatory(false)}
                        className="accent-[#0066FF]"
                      />
                      Optional / Self-Dec
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Initial Status
                  </label>
                  <div className="flex items-center gap-4 text-[12px]">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="headStatus"
                        checked={headStatus === 'Active'}
                        onChange={() => setHeadStatus('Active')}
                        className="accent-[#0066FF]"
                      />
                      <span className="text-emerald-700 font-bold">Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="headStatus"
                        checked={headStatus === 'Inactive'}
                        onChange={() => setHeadStatus('Inactive')}
                        className="accent-[#0066FF]"
                      />
                      <span className="text-slate-500 font-bold">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Policy Guidelines &amp; Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Specify verification rules, bill GSTIN requirements, or approval hierarchy notes..."
                  value={headNotes}
                  onChange={(e) => setHeadNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowHeadModal(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[12.5px] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Check size={15} /> Save Expense Head
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
