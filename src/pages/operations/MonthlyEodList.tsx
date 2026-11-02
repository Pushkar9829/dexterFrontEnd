import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Filter,
  Search,
  RotateCcw,
  Download,
  Building2,
  Calendar,
  MapPin,
  Smartphone,
  Map,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  BarChart2,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
} from 'lucide-react'
import {
  useFfmSfEod,
  exportFfmSfEodCsv,
  getMonthDates,
} from '@/data/eodStore'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'

export default function MonthlyEodList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isReport } = useReportMode()
  const { records } = useFfmSfEod()

  // ── Tab state: 'FFM' | 'SF' ──────────────────────────────────────────────
  const activeTab: 'FFM' | 'SF' =
    searchParams.get('tab')?.toUpperCase() === 'SF' ? 'SF' : 'FFM'

  const handleTabSwitch = (tab: 'FFM' | 'SF') => {
    setSearchParams({ tab: tab.toLowerCase(), ...(isReport ? { source: 'report' } : {}) })
    setCurrentPage(1)
    toast(
      tab === 'FFM'
        ? 'Switched to Full Funding (FFM) Sites'
        : 'Switched to Self Funding (SF) Sites'
    )
  }

  // ── Filter input states ──────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState('October 2026')
  const [filterSiteId, setFilterSiteId] = useState('All Sites')
  const [filterAtmId, setFilterAtmId] = useState('All ATM')
  const [filterFranchise, setFilterFranchise] = useState('All Franchise')
  const [filterState, setFilterState] = useState('All States')

  // Extra filter option state (toggled via Add Filter Option button)
  const [showExtraFilters, setShowExtraFilters] = useState(false)
  const [varianceOnly, setVarianceOnly] = useState(false)
  const [minBalance, setMinBalance] = useState('')
  const [maxBalance, setMaxBalance] = useState('')

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Applied Filters state
  const [appliedFilters, setAppliedFilters] = useState({
    month: 'October 2026',
    siteId: 'All Sites',
    atmId: 'All ATM',
    franchise: 'All Franchise',
    state: 'All States',
    varianceOnly: false,
    minBalance: '',
    maxBalance: '',
  })

  // Pagination & Page Size
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // ── Month Dates calculation (e.g. October 2026 -> 30.09.2026 and 31.10.2026) ──
  const dates = useMemo(() => {
    return getMonthDates(appliedFilters.month)
  }, [appliedFilters.month])

  // ── Dynamic filter dropdown options ──
  const monthOptions = ['October 2026', 'November 2026', 'September 2026', 'August 2026', 'July 2026']

  const siteOptions = useMemo(() => {
    const list = records
      .filter((r) => r.fundingType === activeTab)
      .map((r) => r.siteId)
      .filter(Boolean)
    return ['All Sites', ...Array.from(new Set(list)).sort()]
  }, [records, activeTab])

  const atmOptions = useMemo(() => {
    const list = records
      .filter((r) => r.fundingType === activeTab)
      .map((r) => r.atmId)
      .filter(Boolean)
    return ['All ATM', ...Array.from(new Set(list)).sort()]
  }, [records, activeTab])

  const franchiseOptions = useMemo(() => {
    const list = records
      .filter((r) => r.fundingType === activeTab)
      .map((r) => r.frName)
      .filter(Boolean)
    return ['All Franchise', ...Array.from(new Set(list)).sort()]
  }, [records, activeTab])

  const stateOptions = useMemo(() => {
    const list = records
      .filter((r) => r.fundingType === activeTab)
      .map((r) => r.state)
      .filter(Boolean)
    return ['All States', ...Array.from(new Set(list)).sort()]
  }, [records, activeTab])

  // ── Filter handlers ──
  const handleSearch = () => {
    setAppliedFilters({
      month: selectedMonth,
      siteId: filterSiteId,
      atmId: filterAtmId,
      franchise: filterFranchise,
      state: filterState,
      varianceOnly,
      minBalance,
      maxBalance,
    })
    setCurrentPage(1)
    toast('Filters applied to EOD report')
  }

  const handleReset = () => {
    setSelectedMonth('October 2026')
    setFilterSiteId('All Sites')
    setFilterAtmId('All ATM')
    setFilterFranchise('All Franchise')
    setFilterState('All States')
    setVarianceOnly(false)
    setMinBalance('')
    setMaxBalance('')
    setAppliedFilters({
      month: 'October 2026',
      siteId: 'All Sites',
      atmId: 'All ATM',
      franchise: 'All Franchise',
      state: 'All States',
      varianceOnly: false,
      minBalance: '',
      maxBalance: '',
    })
    setCurrentPage(1)
    toast('Filters reset to default')
  }

  // ── Filtered Records ──
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Must match active tab (FFM or SF)
      if (r.fundingType !== activeTab) return false

      // Match selected Month
      if (appliedFilters.month && r.month !== appliedFilters.month) return false

      // Match Site ID
      if (appliedFilters.siteId !== 'All Sites' && r.siteId !== appliedFilters.siteId) return false

      // Match ATM ID
      if (appliedFilters.atmId !== 'All ATM' && r.atmId !== appliedFilters.atmId) return false

      // Match Franchise Name
      if (appliedFilters.franchise !== 'All Franchise' && r.frName !== appliedFilters.franchise) return false

      // Match State
      if (appliedFilters.state !== 'All States' && r.state !== appliedFilters.state) return false

      // Variance Only filter
      if (appliedFilters.varianceOnly) {
        const hasVariance = r.openPhys !== r.openDms || r.closePhys !== r.closeDms
        if (!hasVariance) return false
      }

      // Min/Max Balance filter
      if (appliedFilters.minBalance && r.actualMachine < Number(appliedFilters.minBalance)) return false
      if (appliedFilters.maxBalance && r.actualMachine > Number(appliedFilters.maxBalance)) return false

      return true
    })
  }, [records, activeTab, appliedFilters])

  // ── Pagination calculations ──
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  // ── Export handlers ──
  const handleExportCsv = () => {
    const filename = `${activeTab.toLowerCase()}-eod-consolidated-${appliedFilters.month.replace(/\s+/g, '-').toLowerCase()}`
    exportFfmSfEodCsv(filteredRecords, filename, dates.openingDate, dates.closingDate, dates.monthYear)
    setShowExportMenu(false)
    toast(`Exported ${activeTab} EOD report as CSV`)
  }

  const handleExportExcel = () => {
    const filename = `${activeTab.toLowerCase()}-eod-consolidated-${appliedFilters.month.replace(/\s+/g, '-').toLowerCase()}`
    exportFfmSfEodCsv(filteredRecords, filename, dates.openingDate, dates.closingDate, dates.monthYear)
    setShowExportMenu(false)
    toast(`Exported ${activeTab} EOD report for Excel`)
  }

  // Format currency helper (displays standard Indian numeric or empty)
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '—'
    return val.toLocaleString('en-IN')
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-4">
      {/* ── Breadcrumb matching Image 01 & 02 ── */}
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
            <span className="font-semibold text-slate-800">
              Monthly EOD ({activeTab === 'FFM' ? 'Full Funding Sites' : 'Self Funding Sites'})
            </span>
          </>
        ) : (
          <>
            <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
              Operations
            </Link>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <Link to="/operations/eod" className="hover:text-[#0066FF] transition-colors">
              Monthly EOD
            </Link>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">
              {activeTab === 'FFM' ? 'Full Funding Sites' : 'Self Funding Sites'}
            </span>
          </>
        )}
      </div>

      {/* ── Page Header with Title & Two-Tab Switcher matching Image 01 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-xs">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[25px]">
              {activeTab === 'FFM'
                ? 'Full Funding Sites EOD Consolidated Report'
                : 'Self Funding Sites EOD Consolidated Report'}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              {activeTab === 'FFM'
                ? 'View consolidated EOD data for Full Funding (FFM) sites with date-wise details.'
                : 'View consolidated EOD data for Self Funding (SF) sites with date-wise details.'}
            </p>
          </div>
        </div>

        {/* ── Top Tab Bar: Full Funding (FFM) vs Self Funding (SF) matching Image 01 ── */}
        <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 p-1 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => handleTabSwitch('FFM')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold transition-all cursor-pointer ${
              activeTab === 'FFM'
                ? 'bg-[#0066FF] text-white shadow-sm'
                : 'text-[#0066FF] hover:bg-white/80'
            }`}
          >
            <span>Full Funding (FFM)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('SF')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold transition-all cursor-pointer ${
              activeTab === 'SF'
                ? 'bg-[#0066FF] text-white shadow-sm'
                : 'text-[#0066FF] hover:bg-white/80'
            }`}
          >
            <span>Self Funding (SF)</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card matching Image 02 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        {/* Filter Card Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Filter size={16} />
          </div>
          <div>
            <h2 className="text-[14.5px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and manage {activeTab === 'FFM' ? 'Full Funding (FFM)' : 'Self Funding (SF)'} monthly EOD records.
            </p>
          </div>
        </div>

        {/* 5 Filter Inputs Grid + Action Buttons matching Image 02 layout */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3.5 justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 flex-1">
            {/* 1. Month & Year * */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Month & Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* 2. Site ID */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site ID</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={filterSiteId}
                  onChange={(e) => setFilterSiteId(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
                >
                  {siteOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* 3. ATM ID */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">ATM ID</label>
              <div className="relative">
                <Smartphone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={filterAtmId}
                  onChange={(e) => setFilterAtmId(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
                >
                  {atmOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* 4. Franchise Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Franchise Name</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={filterFranchise}
                  onChange={(e) => setFilterFranchise(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer truncate"
                >
                  {franchiseOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* 5. State */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
              <div className="relative">
                <Map size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
                >
                  {stateOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* ── Action Buttons inside the Red Box line matching Image 02 ── */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-end pt-1">
            {/* Search (Blue) */}
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Search size={14} />
              <span>Search</span>
            </button>

            {/* Add Filter Option (White outline) */}
            <button
              type="button"
              onClick={() => setShowExtraFilters((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border text-[12.5px] font-medium transition-colors shadow-xs cursor-pointer ${
                showExtraFilters
                  ? 'border-[#0066FF] bg-blue-50/60 text-[#0066FF]'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Filter size={13} className="text-[#0066FF]" />
              <span>{showExtraFilters ? 'Hide Extra Filters' : 'Add Filter Option'}</span>
            </button>

            {/* Download Dropdown (White outline) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Download size={13} className="text-[#0066FF]" />
                <span>Download</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-30">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full px-3.5 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    <span>Download as CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-3.5 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} className="text-[#0066FF]" />
                    <span>Download as Excel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reset (White outline) */}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-medium transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ── Optional Extra Filters (Toggled by 'Add Filter Option') ── */}
        {showExtraFilters && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/60 p-3 rounded-xl">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Discrepancy / Variance
              </label>
              <button
                type="button"
                onClick={() => setVarianceOnly(!varianceOnly)}
                className={`w-full h-8.5 px-3 rounded-lg border text-[12px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  varianceOnly
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Show Variance Only</span>
                <SlidersHorizontal size={13} className={varianceOnly ? 'text-amber-600' : 'text-slate-400'} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Min Machine Balance (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 200000"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Max Machine Balance (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 800000"
                value={maxBalance}
                onChange={(e) => setMaxBalance(e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Table Card matching Image 02 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Card Header matching Image 02 */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
              <BarChart2 size={16} />
            </div>
            <h3 className="text-[14.5px] font-bold text-slate-900">
              {activeTab === 'FFM' ? 'Full Funding Sites' : 'Self Funding Sites'} EOD Consolidated Report – {appliedFilters.month}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-slate-600 font-medium">
              Total Records: <strong className="text-slate-900 font-bold">{totalRecords}</strong>
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-8 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium outline-none focus:border-[#0066FF] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* ── Data Table with Vibrant Canary Yellow Header Row matching Image 02 ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1450px]">
            {/* Header: Bright Yellow background as in Image 02 */}
            <thead>
              <tr className="bg-[#FFFF00] text-slate-950 font-bold text-[11px] leading-snug border-b-2 border-amber-300">
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[55px] uppercase select-none">
                  S.N.
                </th>
                <th className="py-2.5 px-2.5 text-center border-r border-amber-300 w-[110px] uppercase select-none">
                  ATM ID
                </th>
                <th className="py-2.5 px-2.5 text-center border-r border-amber-300 w-[150px] uppercase select-none">
                  FR Name
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[170px] uppercase select-none">
                  Machine Balance as per DMS @11:00 PM ({dates.openingDate})
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[170px] uppercase select-none">
                  Physical Balance as per FR @11:00 PM ({dates.openingDate})
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[140px] uppercase select-none">
                  Actual Overage as on {dates.openingDate}
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[140px] uppercase select-none">
                  HPY Gen Fund {dates.monthYear}
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[140px] uppercase select-none">
                  FR Loading Fund {dates.monthYear}
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[160px] uppercase select-none">
                  Apna App Dispenser Fund {dates.monthYear}
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[140px] uppercase select-none">
                  Actual Machine Balance {dates.closingDate}
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[170px] uppercase select-none">
                  Machine Balance as per DMS @11:00 PM ({dates.closingDate})
                </th>
                <th className="py-2.5 px-2 text-center border-r border-amber-300 w-[170px] uppercase select-none">
                  Physical Balance as per FR @11:00 PM ({dates.closingDate})
                </th>
                <th className="py-2.5 px-2 text-center w-[140px] uppercase select-none">
                  Actual Overage as on {dates.closingDate}
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-[12px] text-slate-800">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((rec, index) => {
                  const serialNo = startIndex + index + 1
                  const hasOpeningVariance = rec.openPhys !== rec.openDms
                  const hasClosingVariance = rec.closePhys !== rec.closeDms

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* 1. S.N. */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-600 border-r border-slate-100">
                        {serialNo}
                      </td>

                      {/* 2. ATM ID */}
                      <td className="py-2.5 px-2.5 font-bold text-[#0066FF] border-r border-slate-100">
                        {rec.atmId}
                      </td>

                      {/* 3. FR Name */}
                      <td className="py-2.5 px-2.5 font-medium text-slate-800 border-r border-slate-100 truncate max-w-[150px]">
                        {rec.frName}
                      </td>

                      {/* 4. Machine Balance as per DMS (Opening) */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {formatINR(rec.openDms)}
                      </td>

                      {/* 5. Physical Balance as per FR (Opening) */}
                      <td className={`py-2.5 px-2.5 text-right font-medium border-r border-slate-100 ${
                        hasOpeningVariance ? 'bg-amber-50 text-amber-800 font-bold' : 'text-slate-700'
                      }`}>
                        {formatINR(rec.openPhys)}
                      </td>

                      {/* 6. Actual Overage (Opening) */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {rec.openOverage > 0 ? (
                          <span className="text-emerald-700 font-semibold">{formatINR(rec.openOverage)}</span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* 7. HPY Gen Fund */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {formatINR(rec.hpyFund)}
                      </td>

                      {/* 8. FR Loading Fund */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {formatINR(rec.frLoading)}
                      </td>

                      {/* 9. Apna App Dispenser Fund */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {formatINR(rec.apnaDispense)}
                      </td>

                      {/* 10. Actual Machine Balance (Closing) */}
                      <td className="py-2.5 px-2.5 text-right font-semibold text-slate-900 border-r border-slate-100">
                        {formatINR(rec.actualMachine)}
                      </td>

                      {/* 11. Machine Balance as per DMS (Closing) */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {formatINR(rec.closeDms)}
                      </td>

                      {/* 12. Physical Balance as per FR (Closing) */}
                      <td className={`py-2.5 px-2.5 text-right font-medium border-r border-slate-100 ${
                        hasClosingVariance ? 'bg-amber-50 text-amber-800 font-bold' : 'text-slate-700'
                      }`}>
                        {formatINR(rec.closePhys)}
                      </td>

                      {/* 13. Actual Overage (Closing) */}
                      <td className="py-2.5 px-2.5 text-right font-medium text-slate-700">
                        {rec.closeOverage > 0 ? (
                          <span className="text-emerald-700 font-semibold">{formatINR(rec.closeOverage)}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                /* ── Matching Image 02 empty state: 10 rows with S.N. 1-10 and blank cells ── */
                Array.from({ length: 10 }, (_, idx) => (
                  <tr key={`empty-row-${idx}`} className="h-9 hover:bg-slate-50/50">
                    <td className="py-2 px-2 text-center font-semibold text-slate-500 border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300 border-r border-slate-100">—</td>
                    <td className="py-2 px-2.5 text-center text-slate-300">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination matching Image 02 ── */}
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 text-[12px] text-slate-600 bg-white">
          <div>
            Showing <strong className="text-slate-900 font-semibold">{totalRecords > 0 ? startIndex + 1 : 1}</strong> to{' '}
            <strong className="text-slate-900 font-semibold">{totalRecords > 0 ? endIndex : 0}</strong> of{' '}
            <strong className="text-slate-900 font-semibold">{totalRecords}</strong> records
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="First page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const isGap = prev && p - prev > 1
                return (
                  <span key={p} className="flex items-center">
                    {isGap && <span className="px-1 text-slate-400">…</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-8 h-8 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                        safePage === p
                          ? 'bg-[#0066FF] text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages || totalRecords === 0}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages || totalRecords === 0}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Last page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
