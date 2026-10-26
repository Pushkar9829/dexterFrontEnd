import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Plus,
  Filter,
  Search,
  RotateCcw,
  Download,
  Building2,
  Users,
  User,
  Hash,
  CreditCard,
  FileText,
  Calendar,
  Landmark,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  FileCheck,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { SD_BANKS, SD_PAYMENT_TYPES } from '@/data/financeSd'
import {
  deleteSecurityDeposit,
  useSecurityDeposits,
} from '@/data/financeSdStore'

export default function SdList() {
  const navigate = useNavigate()
  const deposits = useSecurityDeposits()

  // Filter States
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterFranchiseName, setFilterFranchiseName] = useState('')
  const [filterFranchiseNo, setFilterFranchiseNo] = useState('')
  const [filterHpyAccount, setFilterHpyAccount] = useState('')
  const [filterPaymentType, setFilterPaymentType] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterBankName, setFilterBankName] = useState('')
  const [filterTxnNumber, setFilterTxnNumber] = useState('')

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    siteId: '',
    atmId: '',
    franchiseName: '',
    franchiseNo: '',
    hpyAccount: '',
    paymentType: '',
    dateFrom: '',
    dateTo: '',
    bankName: '',
    txnNumber: '',
  })

  // Pagination
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Options for Dropdowns
  const siteOptions = useMemo(
    () => Array.from(new Set(deposits.map((d) => d.siteId).filter(Boolean))).sort(),
    [deposits]
  )
  const atmOptions = useMemo(
    () => Array.from(new Set(deposits.map((d) => d.atmId).filter(Boolean))).sort(),
    [deposits]
  )
  const franchiseOptions = useMemo(
    () => Array.from(new Set(deposits.map((d) => d.franchiseeName).filter(Boolean))).sort(),
    [deposits]
  )
  const hpyOptions = useMemo(
    () => Array.from(new Set(deposits.map((d) => d.hpyAccount).filter(Boolean))).sort(),
    [deposits]
  )

  const handleSearch = () => {
    setAppliedFilters({
      siteId: filterSiteId,
      atmId: filterAtmId,
      franchiseName: filterFranchiseName,
      franchiseNo: filterFranchiseNo,
      hpyAccount: filterHpyAccount,
      paymentType: filterPaymentType,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      bankName: filterBankName,
      txnNumber: filterTxnNumber,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFilterSiteId('')
    setFilterAtmId('')
    setFilterFranchiseName('')
    setFilterFranchiseNo('')
    setFilterHpyAccount('')
    setFilterPaymentType('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterBankName('')
    setFilterTxnNumber('')
    setAppliedFilters({
      siteId: '',
      atmId: '',
      franchiseName: '',
      franchiseNo: '',
      hpyAccount: '',
      paymentType: '',
      dateFrom: '',
      dateTo: '',
      bankName: '',
      txnNumber: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filtered Data
  const filtered = useMemo(() => {
    return deposits.filter((dep) => {
      if (appliedFilters.siteId && dep.siteId !== appliedFilters.siteId) return false
      if (appliedFilters.atmId && dep.atmId !== appliedFilters.atmId) return false
      if (
        appliedFilters.franchiseName &&
        !dep.franchiseeName.toLowerCase().includes(appliedFilters.franchiseName.toLowerCase())
      ) {
        return false
      }
      if (appliedFilters.franchiseNo && !dep.franchiseeNo.includes(appliedFilters.franchiseNo)) {
        return false
      }
      if (appliedFilters.hpyAccount && dep.hpyAccount !== appliedFilters.hpyAccount) {
        return false
      }
      if (appliedFilters.paymentType && dep.paymentType !== appliedFilters.paymentType) {
        return false
      }
      if (appliedFilters.bankName && dep.frBankName !== appliedFilters.bankName) {
        return false
      }
      if (
        appliedFilters.txnNumber &&
        !dep.txnNumber.toLowerCase().includes(appliedFilters.txnNumber.toLowerCase())
      ) {
        return false
      }
      if (appliedFilters.dateFrom && dep.paymentDate < appliedFilters.dateFrom) {
        return false
      }
      if (appliedFilters.dateTo && dep.paymentDate > appliedFilters.dateTo) {
        return false
      }
      return true
    })
  }, [deposits, appliedFilters])

  // Pagination
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const handleExport = () => {
    if (filtered.length === 0) {
      toast('No records to export')
      return
    }
    const headers = [
      'S.N.',
      'Site ID',
      'ATM ID',
      'Franchisee Name',
      'Franchisee No.',
      'Cash Live Date',
      'HPY Account Number',
      'Payment Type',
      'Payment Date',
      'Payment Transfer Time',
      'TXN Number',
      'Amount',
      'FR Bank Name',
      'Account Holder Name',
      'FR Account',
      'FR IFSC',
    ]

    const rows = filtered.map((d, i) => [
      String(i + 1),
      d.siteId,
      d.atmId,
      d.franchiseeName,
      d.franchiseeNo,
      d.cashLiveDate,
      d.hpyAccount,
      d.paymentType,
      d.paymentDate,
      d.transferTime,
      d.txnNumber,
      d.amount,
      d.frBankName,
      d.accountHolder,
      d.frAccount,
      d.frIfsc,
    ])

    downloadCsv(`Security_Deposit_Data_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filtered.length} security deposit records to CSV`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the security deposit record for ${name}?`)) {
      deleteSecurityDeposit(id)
      toast(`Record deleted`)
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Breadcrumb matching Image 1: Workspace > Finance > Security Deposit Data */}
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
        <span className="font-semibold text-slate-800">Security Deposit</span>
      </div>

      {/* Page Title & Top Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            Security Deposit
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            View and manage franchise security deposit payment records.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/finance/sd/new')}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Security Deposit</span>
          </button>
        </div>
      </div>

      {/* Filter Section matching Image 1 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        {/* Filter Card Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and view security deposit records.
            </p>
          </div>
        </div>

        {/* 10 Filter Inputs Grid (2 rows x 5 cols on lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Row 1, Col 1: Site ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Site ID
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select site ID</option>
                {siteOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 1, Col 2: ATM ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              ATM ID
            </label>
            <div className="relative">
              <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select ATM ID</option>
                {atmOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 1, Col 3: Franchise Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Franchise Name
            </label>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterFranchiseName}
                onChange={(e) => setFilterFranchiseName(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select franchise name</option>
                {franchiseOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 1, Col 4: Franchise No. */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Franchise No.
            </label>
            <div className="relative">
              <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                value={filterFranchiseNo}
                onChange={(e) => setFilterFranchiseNo(e.target.value)}
                placeholder="Enter franchise no."
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 1, Col 5: HPY Account Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              HPY Account Number
            </label>
            <div className="relative">
              <CreditCard size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterHpyAccount}
                onChange={(e) => setFilterHpyAccount(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select HPY account no.</option>
                {hpyOptions.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 1: Payment Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Payment Type
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterPaymentType}
                onChange={(e) => setFilterPaymentType(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select payment type</option>
                {SD_PAYMENT_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 2: Payment Date From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Payment Date From
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 2, Col 3: Payment Date To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Payment Date To
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 2, Col 4: FR Bank Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              FR Bank Name
            </label>
            <div className="relative">
              <Landmark size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterBankName}
                onChange={(e) => setFilterBankName(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select bank name</option>
                {SD_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 5: TXN Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              TXN Number
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                value={filterTxnNumber}
                onChange={(e) => setFilterTxnNumber(e.target.value)}
                placeholder="Enter TXN number"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-4 pt-1">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm"
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Records Card ("Security Deposit Records") matching Image 1 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Landmark size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Security Deposit Records
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-600 font-medium">
              Total Records: {totalRecords}
            </span>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-3 pr-7 text-[12px] font-medium rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Site ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  ATM ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Franchisee<br />Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Franchisee<br />No.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Cash Live<br />Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  HPY Account<br />Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Payment<br />Type
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Payment<br />Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Payment<br />Transfer Time
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] w-24">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginated.length > 0 ? (
                paginated.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-center"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/finance/sd/${item.id}`)}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        {item.siteId || '—'}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700">
                      {item.atmId || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      {item.franchiseeName || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.franchiseeNo || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                      {item.cashLiveDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700 font-mono text-[10.5px]">
                      {item.hpyAccount || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                        {item.paymentType || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700">
                      {item.paymentDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600 font-mono text-[10.5px]">
                      {item.transferTime || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/finance/sd/${item.id}`)}
                          className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded"
                          title="Edit / Open"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.franchiseeName)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                /* Exact Empty State matching Image 1 */
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">
                        No records found
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your filters or click on "New Security Deposit" to add a record.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => navigate('/finance/sd/new')}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold transition-all shadow-xs"
                        >
                          <Plus size={13} />
                          New Security Deposit
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 bg-white gap-3">
          <div className="text-[12px] text-slate-500">
            {totalRecords === 0
              ? 'Showing 0 to 0 of 0 records'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords} records`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            <button
              className="w-7 h-7 rounded bg-[#0066FF] text-white text-[12px] font-semibold flex items-center justify-center shadow-xs"
            >
              {currentPage}
            </button>

            {totalPages > 1 && currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded border border-slate-200 text-slate-700 text-[12px] font-medium flex items-center justify-center hover:bg-slate-50"
              >
                {currentPage + 1}
              </button>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Last Page"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
