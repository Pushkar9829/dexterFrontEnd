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
  ListFilter,
  Edit2,
  Trash2,
  ExternalLink,
  FileCheck,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import {
  CLF_SETTLEMENT_BANKS,
  CLF_STATUS,
  deleteClfRecord,
  useClfRecords,
} from '@/data/financeClf'

export default function ClfList() {
  const navigate = useNavigate()
  const records = useClfRecords()

  // Filter States
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterFranchiseName, setFilterFranchiseName] = useState('')
  const [filterFranchiseNo, setFilterFranchiseNo] = useState('')
  const [filterCashLiveDateFrom, setFilterCashLiveDateFrom] = useState('')
  const [filterCashLiveDateTo, setFilterCashLiveDateTo] = useState('')
  const [filterClfStatus, setFilterClfStatus] = useState('')
  const [filterHpyAccount, setFilterHpyAccount] = useState('')
  const [filterPaymentDateFrom, setFilterPaymentDateFrom] = useState('')
  const [filterPaymentDateTo, setFilterPaymentDateTo] = useState('')
  const [filterBankName, setFilterBankName] = useState('')
  const [filterSettlementBank, setFilterSettlementBank] = useState('')
  const [filterUtrNumber, setFilterUtrNumber] = useState('')

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    siteId: '',
    atmId: '',
    franchiseName: '',
    franchiseNo: '',
    cashLiveDateFrom: '',
    cashLiveDateTo: '',
    clfStatus: '',
    hpyAccount: '',
    paymentDateFrom: '',
    paymentDateTo: '',
    bankName: '',
    settlementBank: '',
    utrNumber: '',
  })

  // Pagination
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Options for Dropdowns
  const siteOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.siteId).filter(Boolean))).sort(),
    [records]
  )
  const atmOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.atmId).filter(Boolean))).sort(),
    [records]
  )
  const franchiseOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.franchiseeName).filter(Boolean))).sort(),
    [records]
  )
  const hpyOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.hpyAccount).filter(Boolean))).sort(),
    [records]
  )
  const frBankOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.frBank).filter(Boolean))).sort(),
    [records]
  )

  const handleSearch = () => {
    setAppliedFilters({
      siteId: filterSiteId,
      atmId: filterAtmId,
      franchiseName: filterFranchiseName,
      franchiseNo: filterFranchiseNo,
      cashLiveDateFrom: filterCashLiveDateFrom,
      cashLiveDateTo: filterCashLiveDateTo,
      clfStatus: filterClfStatus,
      hpyAccount: filterHpyAccount,
      paymentDateFrom: filterPaymentDateFrom,
      paymentDateTo: filterPaymentDateTo,
      bankName: filterBankName,
      settlementBank: filterSettlementBank,
      utrNumber: filterUtrNumber,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFilterSiteId('')
    setFilterAtmId('')
    setFilterFranchiseName('')
    setFilterFranchiseNo('')
    setFilterCashLiveDateFrom('')
    setFilterCashLiveDateTo('')
    setFilterClfStatus('')
    setFilterHpyAccount('')
    setFilterPaymentDateFrom('')
    setFilterPaymentDateTo('')
    setFilterBankName('')
    setFilterSettlementBank('')
    setFilterUtrNumber('')
    setAppliedFilters({
      siteId: '',
      atmId: '',
      franchiseName: '',
      franchiseNo: '',
      cashLiveDateFrom: '',
      cashLiveDateTo: '',
      clfStatus: '',
      hpyAccount: '',
      paymentDateFrom: '',
      paymentDateTo: '',
      bankName: '',
      settlementBank: '',
      utrNumber: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filtered List
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (appliedFilters.siteId && r.siteId !== appliedFilters.siteId) return false
      if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
      if (appliedFilters.franchiseName && r.franchiseeName !== appliedFilters.franchiseName) return false
      if (
        appliedFilters.franchiseNo &&
        !r.franchiseeNo.toLowerCase().includes(appliedFilters.franchiseNo.toLowerCase())
      ) {
        return false
      }
      if (appliedFilters.clfStatus && r.clfStatus !== appliedFilters.clfStatus) return false
      if (appliedFilters.hpyAccount && r.hpyAccount !== appliedFilters.hpyAccount) return false
      if (appliedFilters.bankName && r.frBank !== appliedFilters.bankName) return false
      if (appliedFilters.settlementBank && r.settlementBank !== appliedFilters.settlementBank) return false
      if (
        appliedFilters.utrNumber &&
        !r.utr.toLowerCase().includes(appliedFilters.utrNumber.toLowerCase())
      ) {
        return false
      }
      if (appliedFilters.cashLiveDateFrom && r.cashLiveDate < appliedFilters.cashLiveDateFrom) return false
      if (appliedFilters.cashLiveDateTo && r.cashLiveDate > appliedFilters.cashLiveDateTo) return false
      if (appliedFilters.paymentDateFrom && r.paymentDate < appliedFilters.paymentDateFrom) return false
      if (appliedFilters.paymentDateTo && r.paymentDate > appliedFilters.paymentDateTo) return false
      return true
    })
  }, [records, appliedFilters])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Export CSV
  const handleExport = () => {
    const headers = [
      'S.N.',
      'Site ID',
      'ATM ID',
      'Franchise Name',
      'Franchise No.',
      'Cash Live Date',
      'CLF Status',
      'HPY Account Number',
      'CLF Amount',
      'Payment Date',
      'Payment Transfer Time',
      'FR Bank Name',
      'Account Holder Name',
      'NEFT-UTR-IMPS Number',
      'Settlement Bank Name',
    ]

    const rows = filtered.map((r, i) => [
      String(i + 1),
      r.siteId,
      r.atmId,
      r.franchiseeName,
      r.franchiseeNo,
      r.cashLiveDate,
      r.clfStatus,
      r.hpyAccount,
      r.clfAmount,
      r.paymentDate,
      r.transferTime,
      r.frBank,
      r.holder,
      r.utr,
      r.settlementBank,
    ])

    downloadCsv(`CLF_Data_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filtered.length} records to CSV`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the record for ${name}?`)) {
      deleteClfRecord(id)
      toast('Record deleted')
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Breadcrumb matching Image 1: Workspace > Finance > CLF Data */}
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
        <span className="font-semibold text-slate-800">CLF Data</span>
      </div>

      {/* Page Title & Top Action Button matching Image 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            CLF Data
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            View and manage Cash Loading Funds transactions.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/finance/clf/new')}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New CLF</span>
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
              Use below filters to search and view CLF records.
            </p>
          </div>
        </div>

        {/* Row 1 Filters: Site ID, ATM ID, Franchise Name, Franchise No., Cash Live Date From, Cash Live Date To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {/* Site ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Site ID
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select site ID</option>
                {siteOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* ATM ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ATM ID
            </label>
            <div className="relative">
              <CreditCard
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select ATM ID</option>
                {atmOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Franchise Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Franchise Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterFranchiseName}
                onChange={(e) => setFilterFranchiseName(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
              >
                <option value="">Select franchise name</option>
                {franchiseOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Franchise No. */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Franchise No.
            </label>
            <div className="relative">
              <Hash
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterFranchiseNo}
                onChange={(e) => setFilterFranchiseNo(e.target.value)}
                placeholder="Enter franchise no."
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Cash Live Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cash Live Date From
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterCashLiveDateFrom}
                onChange={(e) => setFilterCashLiveDateFrom(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Cash Live Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cash Live Date To
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterCashLiveDateTo}
                onChange={(e) => setFilterCashLiveDateTo(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Row 2 Filters: CLF Status, HPY Account, Payment Date From, Payment Date To, FR Bank, Settlement Bank, UTR Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {/* CLF Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              CLF Status
            </label>
            <div className="relative">
              <ListFilter
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterClfStatus}
                onChange={(e) => setFilterClfStatus(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select status</option>
                {CLF_STATUS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* HPY Account Number */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              HPY Account Number
            </label>
            <div className="relative">
              <CreditCard
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterHpyAccount}
                onChange={(e) => setFilterHpyAccount(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
              >
                <option value="">Select HPY account no.</option>
                {hpyOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Payment Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Payment Date From
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterPaymentDateFrom}
                onChange={(e) => setFilterPaymentDateFrom(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Payment Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Payment Date To
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterPaymentDateTo}
                onChange={(e) => setFilterPaymentDateTo(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* FR Bank Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              FR Bank Name
            </label>
            <div className="relative">
              <Landmark
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterBankName}
                onChange={(e) => setFilterBankName(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
              >
                <option value="">Select bank name</option>
                {frBankOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Settlement Bank Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Settlement Bank Name
            </label>
            <div className="relative">
              <Landmark
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterSettlementBank}
                onChange={(e) => setFilterSettlementBank(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
              >
                <option value="">Select settlement bank</option>
                {CLF_SETTLEMENT_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* NEFT-UTR-IMPS Number */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              NEFT-UTR-IMPS Number
            </label>
            <div className="relative">
              <FileText
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterUtrNumber}
                onChange={(e) => setFilterUtrNumber(e.target.value)}
                placeholder="Enter NEFT / UTR / IMPS no."
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons matching Image 1: Search, Reset, Download */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm"
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <Download size={14} />
            <span>Download</span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Records Card ("CLF Records") matching Image 1 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Landmark size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              CLF Records
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
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Table View matching Image 1 */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1200px]">
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
                  Franchise Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Franchise No.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Cash Live Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  CLF Status
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  HPY Account Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  CLF Amount
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Payment Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Payment Transfer Time
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
                        onClick={() => navigate(`/finance/clf/${item.id}`)}
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
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                      {item.franchiseeNo || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                      {item.cashLiveDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700">
                      {item.clfStatus || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-[10.5px] text-slate-700">
                      {item.hpyAccount || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-semibold text-slate-800">
                      {item.clfAmount || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700">
                      {item.paymentDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-[10.5px] text-slate-600">
                      {item.transferTime || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/finance/clf/${item.id}`)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/60 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.franchiseeName)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty State */
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">
                        No records found
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your filters or click on "New CLF" to add a record.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => navigate('/finance/clf/new')}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold transition-all shadow-xs"
                        >
                          <Plus size={13} />
                          New CLF
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
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  totalRecords
                )} of ${totalRecords} records`}
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

            {/* Dynamic Page Buttons: 1, 2, 3, 4, 5 ... */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              const isActive = currentPage === pageNum
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded text-[12px] font-semibold flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

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
