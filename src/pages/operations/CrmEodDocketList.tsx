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
  Smartphone,
  MapPin,
  FileText,
  FileCheck,
  Calendar,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Eye,
  ArrowUpDown,
} from 'lucide-react'
import {
  useCrmDockets,
  exportCrmDocketsCsv,
  type CrmEodDocketRecord,
} from '@/data/eodStore'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'

export default function CrmEodDocketList() {
  const navigate = useNavigate()
  const { isReport } = useReportMode()
  const { dockets } = useCrmDockets()

  // Filter input states matching Image layout
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterDocketNo, setFilterDocketNo] = useState('')
  const [filterFranchise, setFilterFranchise] = useState('')
  const [filterMobile, setFilterMobile] = useState('')
  const [filterSiteType, setFilterSiteType] = useState('')
  const [filterPurpose, setFilterPurpose] = useState('')
  const [filterCounterSlip, setFilterCounterSlip] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterRemark, setFilterRemark] = useState('')

  // Applied Filters state
  const [appliedFilters, setAppliedFilters] = useState({
    atmId: '',
    docketNo: '',
    franchise: '',
    mobile: '',
    siteType: '',
    purpose: '',
    counterSlip: '',
    dateFrom: '',
    dateTo: '',
    remark: '',
  })

  // Pagination & Page Size
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Sorting
  const [sortField, setSortField] = useState<keyof CrmEodDocketRecord>('docketNumber')
  const [sortAsc, setSortAsc] = useState<boolean>(true)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Dropdown options
  const atmOptions = useMemo(
    () => Array.from(new Set(dockets.map((d) => d.atmId).filter(Boolean))).sort(),
    [dockets]
  )
  const franchiseOptions = useMemo(
    () => Array.from(new Set(dockets.map((d) => d.franchise).filter(Boolean))).sort(),
    [dockets]
  )

  const handleSearch = () => {
    setAppliedFilters({
      atmId: filterAtmId,
      docketNo: filterDocketNo,
      franchise: filterFranchise,
      mobile: filterMobile,
      siteType: filterSiteType,
      purpose: filterPurpose,
      counterSlip: filterCounterSlip,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      remark: filterRemark,
    })
    setCurrentPage(1)
    toast('Filters applied to CRM EOD docket records')
  }

  const handleReset = () => {
    setFilterAtmId('')
    setFilterDocketNo('')
    setFilterFranchise('')
    setFilterMobile('')
    setFilterSiteType('')
    setFilterPurpose('')
    setFilterCounterSlip('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterRemark('')
    setAppliedFilters({
      atmId: '',
      docketNo: '',
      franchise: '',
      mobile: '',
      siteType: '',
      purpose: '',
      counterSlip: '',
      dateFrom: '',
      dateTo: '',
      remark: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  const handleSort = (field: keyof CrmEodDocketRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return dockets
      .filter((r) => {
        if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
        if (
          appliedFilters.docketNo &&
          !r.docketNumber.toLowerCase().includes(appliedFilters.docketNo.toLowerCase())
        ) {
          return false
        }
        if (
          appliedFilters.franchise &&
          !r.franchise.toLowerCase().includes(appliedFilters.franchise.toLowerCase())
        ) {
          return false
        }
        if (appliedFilters.mobile && !r.mobileNo.includes(appliedFilters.mobile)) return false
        if (appliedFilters.siteType && r.siteType !== appliedFilters.siteType) return false
        if (appliedFilters.purpose && r.purpose !== appliedFilters.purpose) return false
        if (appliedFilters.counterSlip && r.counterSlip !== appliedFilters.counterSlip) return false
        if (
          appliedFilters.remark &&
          !r.remark.toLowerCase().includes(appliedFilters.remark.toLowerCase())
        ) {
          return false
        }
        if (appliedFilters.dateFrom && r.eodDate < appliedFilters.dateFrom) return false
        if (appliedFilters.dateTo && r.eodDate > appliedFilters.dateTo) return false
        return true
      })
      .sort((a, b) => {
        const valA = (a[sortField] || '').toString().toLowerCase()
        const valB = (b[sortField] || '').toString().toLowerCase()
        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
      })
  }, [dockets, appliedFilters, sortField, sortAsc])

  // Pagination calculations
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  const downloadSingleDocket = (r: CrmEodDocketRecord) => {
    exportCrmDocketsCsv([r], `docket-${r.docketNumber}`)
    toast(`Downloaded docket ${r.docketNumber}`)
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-4">
      {/* ── Breadcrumb matching Image layout ── */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        {isReport ? (
          <>
            <Link to="/reports" className="hover:text-[#0066FF] transition-colors">
              Reports & MIS
            </Link>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">CRM EOD Docket Report</span>
          </>
        ) : (
          <>
            <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
              Operations
            </Link>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <Link to="/operations/eod" className="hover:text-[#0066FF] transition-colors">
              CRM EOD
            </Link>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">Docket Data Report</span>
          </>
        )}
      </div>

      {/* ── Page Title & Top Action Button matching Image layout ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            {isReport ? 'CRM EOD Docket Report' : 'CRM EOD Request Docket Number Data'}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {isReport
              ? 'View and export CRM EOD request docket numbers and counter slips.'
              : 'View, search and manage CRM EOD docket request records.'}
          </p>
        </div>

        {!isReport && (
          <div>
            <Link
              to="/operations/eod/crm/new"
              className="inline-flex items-center gap-2 h-9.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>New Docket</span>
            </Link>
          </div>
        )}
      </div>

      {/* ── Dedicated Filter Card matching Image layout ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        {/* Filter Card Header with blue square icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and manage CRM EOD docket records.
            </p>
          </div>
        </div>

        {/* 10 Filter Inputs Grid (2 rows x 5 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Row 1, Col 1: ATM ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              ATM ID
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select ATM ID</option>
                {atmOptions.map((atm) => (
                  <option key={atm} value={atm}>
                    {atm}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 1, Col 2: Docket Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Docket Number
            </label>
            <div className="relative">
              <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="Enter docket no."
                value={filterDocketNo}
                onChange={(e) => setFilterDocketNo(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
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
                value={filterFranchise}
                onChange={(e) => setFilterFranchise(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select franchise name</option>
                {franchiseOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 1, Col 4: Mobile No. */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Mobile No.
            </label>
            <div className="relative">
              <Smartphone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="Enter mobile no."
                value={filterMobile}
                onChange={(e) => setFilterMobile(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 1, Col 5: Site Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Site Type
            </label>
            <div className="relative">
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterSiteType}
                onChange={(e) => setFilterSiteType(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select site type</option>
                <option value="FFM">FFM</option>
                <option value="SF">SF</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 1: Purpose */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Purpose
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select purpose</option>
                <option value="Routine EOD">Routine EOD</option>
                <option value="Monthly EOD">Monthly EOD</option>
                <option value="Cash Audit">Cash Audit</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 2: Counter Slip */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Counter Slip
            </label>
            <div className="relative">
              <FileCheck size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterCounterSlip}
                onChange={(e) => setFilterCounterSlip(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select slip status</option>
                <option value="Uploaded">Uploaded</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 3: EOD Date From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              EOD Date From
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 4: EOD Date To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              EOD Date To
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
              <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 5: Remark */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Remark
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="Enter remark"
                value={filterRemark}
                onChange={(e) => setFilterRemark(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* ── Filter Action Buttons at Bottom Right matching Image ── */}
        <div className="mt-4 pt-3 flex items-center justify-end gap-2.5">
          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw size={14} className="text-slate-600" />
            <span>Reset</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Download size={14} className="text-slate-600" />
              <span>Export</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-30 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    exportCrmDocketsCsv(filteredRecords, 'crm-eod-dockets-filtered')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Export Filtered ({filteredRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportCrmDocketsCsv(dockets, 'crm-eod-dockets-all')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Export All ({dockets.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Data Card: CRM EOD Docket Data Report matching Image ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Card Header with blue icon square */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <FileText size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900">
              CRM EOD Docket Data Report
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-[#475569] font-medium">
              Total Records: <strong className="text-slate-900">{totalRecords}</strong>
            </span>
            <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-7 rounded-lg border border-slate-200 bg-white py-0.5 px-2.5 text-[12px] font-semibold text-slate-700 outline-none focus:border-[#0066FF]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table matching light-tinted header */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#F0F5FA] border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-[#475569]">
                <th className="py-2.5 px-3 w-12 text-center">S.N.</th>
                <th
                  onClick={() => handleSort('atmId')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ATM ID</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('docketNumber')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Docket Number</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('franchise')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Franchise</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('mobileNo')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Mobile No.</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('purpose')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Purpose</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('counterSlip')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Counter Slip</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('eodDate')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>EOD Date</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('remark')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Remark</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#334155]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No matching CRM EOD docket records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                      {startIndex + i + 1}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-[#1E293B]">
                      {r.atmId}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-800">
                      {r.docketNumber}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                      {r.franchise}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {r.mobileNo}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {r.purpose === 'Routine EOD' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                          Routine EOD
                        </span>
                      )}
                      {r.purpose === 'Monthly EOD' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-[#F3E8FF] text-[#9333EA] border border-[#E9D5FF]">
                          Monthly EOD
                        </span>
                      )}
                      {r.purpose === 'Cash Audit' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                          Cash Audit
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {r.counterSlip === 'Uploaded' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                          Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                      {r.eodDate}
                    </td>
                    <td className="py-2.5 px-3 truncate max-w-xs text-slate-600">
                      {r.remark}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(isReport ? `/operations/eod/crm/${r.docketNumber}?source=report` : `/operations/eod/crm/${r.docketNumber}`)}
                          title={isReport ? 'View Docket' : 'View / Edit Docket'}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0066FF] hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSingleDocket(r)}
                          title="Download Docket Data"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0066FF] hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer Bar with Pagination matching Image ── */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-600">
          <div>
            Showing <strong>{startIndex + 1}</strong> to{' '}
            <strong>{endIndex}</strong> of <strong>{totalRecords}</strong> records
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                    safePage === p
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              )
            })}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
