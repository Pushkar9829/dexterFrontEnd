import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  RotateCcw,
  Search,
  User,
  CreditCard,
  Building2,
  Settings,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'

export interface MonthlyAtmRecord {
  sn: number
  atmId: string
  model: string
  cashLiveDate: string
  siteId: string
  name: string
}

// 10 realistic ATM records
const BASE_RECORDS: MonthlyAtmRecord[] = [
  {
    sn: 1,
    atmId: 'ATM-100234',
    model: 'Garnet Model',
    cashLiveDate: '12.04.2025',
    siteId: 'ST-MH-PUN-00124',
    name: 'Om Sai Enterprises',
  },
  {
    sn: 2,
    atmId: 'ATM-100235',
    model: 'Sapphire Model',
    cashLiveDate: '15.06.2025',
    siteId: 'ST-KA-BLR-00125',
    name: 'Balaji Financial Services',
  },
  {
    sn: 3,
    atmId: 'ATM-100236',
    model: 'Diamond Model',
    cashLiveDate: '20.08.2025',
    siteId: 'ST-TN-CHN-00126',
    name: 'Shree Ganesh Associates',
  },
  {
    sn: 4,
    atmId: 'ATM-100237',
    model: 'Platinum Model',
    cashLiveDate: '05.09.2025',
    siteId: 'ST-DL-DEL-00127',
    name: 'Apex Logistics & Fin',
  },
  {
    sn: 5,
    atmId: 'ATM-100238',
    model: 'Garnet Model',
    cashLiveDate: '10.10.2025',
    siteId: 'ST-MH-MUM-00128',
    name: 'Star FinTech Solutions',
  },
  {
    sn: 6,
    atmId: 'ATM-100239',
    model: 'Sapphire Model',
    cashLiveDate: '01.11.2025',
    siteId: 'ST-UP-LKO-00129',
    name: 'Avadh Communication',
  },
  {
    sn: 7,
    atmId: 'ATM-100240',
    model: 'Diamond Model',
    cashLiveDate: '18.11.2025',
    siteId: 'ST-GJ-AHM-00130',
    name: 'Sardar Patel Digital Hub',
  },
  {
    sn: 8,
    atmId: 'ATM-100241',
    model: 'Platinum Model',
    cashLiveDate: '25.12.2025',
    siteId: 'ST-RJ-JAI-00131',
    name: 'Marwar Financial Center',
  },
  {
    sn: 9,
    atmId: 'ATM-100242',
    model: 'Garnet Model',
    cashLiveDate: '14.01.2026',
    siteId: 'ST-WB-KOL-00132',
    name: 'Howrah ATM Services',
  },
  {
    sn: 10,
    atmId: 'ATM-100243',
    model: 'Sapphire Model',
    cashLiveDate: '28.02.2026',
    siteId: 'ST-MP-IND-00133',
    name: 'Malwa Cash Point',
  },
]

// Available Month & Year options
const MONTH_YEAR_OPTIONS = [
  { label: 'May 2025', month: 4, year: 2025 },
  { label: 'June 2025', month: 5, year: 2025 },
  { label: 'July 2025', month: 6, year: 2025 },
  { label: 'August 2025', month: 7, year: 2025 },
  { label: 'September 2025', month: 8, year: 2025 },
  { label: 'October 2025', month: 9, year: 2025 },
  { label: 'November 2025', month: 10, year: 2025 },
  { label: 'December 2025', month: 11, year: 2025 },
  { label: 'January 2026', month: 0, year: 2026 },
  { label: 'February 2026', month: 1, year: 2026 },
  { label: 'March 2026', month: 2, year: 2026 },
  { label: 'April 2026', month: 3, year: 2026 },
  { label: 'May 2026', month: 4, year: 2026 },
  { label: 'October 2026', month: 9, year: 2026 },
  { label: 'November 2026', month: 10, year: 2026 },
]

// Helper to get days in month
function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

// Deterministic mock daily transaction count & amount
function getDailyTxnData(atmId: string, day: number, monthIndex: number, year: number) {
  // Use char codes and year for stable seed
  const numSeed = atmId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + (year % 100)
  const isWeekend = (day + monthIndex * 2) % 7 === 0 || (day + monthIndex * 2) % 7 === 6
  const baseCount = 85 + ((numSeed * 17 + day * 13) % 95) + (isWeekend ? 35 : 0)
  const avgTxnSize = 2800 + ((numSeed * 7 + day * 23) % 800)
  const totalAmount = baseCount * avgTxnSize

  return {
    count: baseCount.toString(),
    amount: totalAmount.toLocaleString('en-IN'),
  }
}

export default function MonthlyTxnsReport() {
  // Selected Month & Year (Default to May 2025 matching Page 01)
  const [selectedMonthYearLabel, setSelectedMonthYearLabel] = useState<string>('May 2025')
  const [filterSiteId, setFilterSiteId] = useState<string>('')
  const [filterAtmId, setFilterAtmId] = useState<string>('')
  const [filterModel, setFilterModel] = useState<string>('')
  const [filterFranchisee, setFilterFranchisee] = useState<string>('')

  // Applied Filters State
  const [appliedFilters, setAppliedFilters] = useState({
    monthYearLabel: 'May 2025',
    siteId: '',
    atmId: '',
    model: '',
    franchisee: '',
  })

  // Pagination
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Export menu toggle
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)

  // Parse Month & Year
  const currentMonthConfig = useMemo(() => {
    const found = MONTH_YEAR_OPTIONS.find((m) => m.label === appliedFilters.monthYearLabel)
    return found || { label: 'May 2025', month: 4, year: 2025 }
  }, [appliedFilters.monthYearLabel])

  // Generate Date Headers: 01.05.2025, 02.05.2025 ...
  const dateColumns = useMemo(() => {
    const daysCount = getDaysInMonth(currentMonthConfig.year, currentMonthConfig.month)
    const monthStr = String(currentMonthConfig.month + 1).padStart(2, '0')
    const yearStr = String(currentMonthConfig.year)
    const dates: string[] = []

    for (let day = 1; day <= daysCount; day++) {
      const dayStr = String(day).padStart(2, '0')
      dates.push(`${dayStr}.${monthStr}.${yearStr}`)
    }
    return dates
  }, [currentMonthConfig])

  // Dropdown options
  const siteOptions = useMemo(
    () => Array.from(new Set(BASE_RECORDS.map((r) => r.siteId))).sort(),
    []
  )
  const atmOptions = useMemo(
    () => Array.from(new Set(BASE_RECORDS.map((r) => r.atmId))).sort(),
    []
  )
  const modelOptions = useMemo(
    () => Array.from(new Set(BASE_RECORDS.map((r) => r.model))).sort(),
    []
  )
  const franchiseeOptions = useMemo(
    () => Array.from(new Set(BASE_RECORDS.map((r) => r.name))).sort(),
    []
  )

  // Handle Search
  const handleSearch = () => {
    setAppliedFilters({
      monthYearLabel: selectedMonthYearLabel,
      siteId: filterSiteId,
      atmId: filterAtmId,
      model: filterModel,
      franchisee: filterFranchisee,
    })
    setCurrentPage(1)
    toast('Filters applied to monthly TXN report')
  }

  // Handle Reset
  const handleReset = () => {
    setSelectedMonthYearLabel('May 2025')
    setFilterSiteId('')
    setFilterAtmId('')
    setFilterModel('')
    setFilterFranchisee('')
    setAppliedFilters({
      monthYearLabel: 'May 2025',
      siteId: '',
      atmId: '',
      model: '',
      franchisee: '',
    })
    setCurrentPage(1)
    toast('Filters reset to default')
  }

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return BASE_RECORDS.filter((r) => {
      if (appliedFilters.siteId && r.siteId !== appliedFilters.siteId) return false
      if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
      if (appliedFilters.model && r.model !== appliedFilters.model) return false
      if (appliedFilters.franchisee && r.name !== appliedFilters.franchisee) return false
      return true
    })
  }, [appliedFilters])

  // Pagination calculation
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(startIndex, endIndex)
  }, [filteredRecords, startIndex, endIndex])

  // Export CSV handler
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      toast('No records to export')
      return
    }

    const headers = [
      'S.N.',
      'ATM ID',
      'Model',
      'Cash Live Date',
      'Site ID',
      'Name',
      'Particulars',
      ...dateColumns,
    ]

    const rows: string[][] = []

    filteredRecords.forEach((rec, idx) => {
      // Row 1: TXN Count
      const countRow: string[] = [
        String(idx + 1),
        rec.atmId,
        rec.model,
        rec.cashLiveDate,
        rec.siteId,
        rec.name,
        'TXN Count',
      ]

      // Row 2: TXN Amount
      const amtRow: string[] = [
        String(idx + 1),
        rec.atmId,
        rec.model,
        rec.cashLiveDate,
        rec.siteId,
        rec.name,
        'TXN Amount',
      ]

      dateColumns.forEach((_, dIdx) => {
        const d = dIdx + 1
        const data = getDailyTxnData(
          rec.atmId,
          d,
          currentMonthConfig.month,
          currentMonthConfig.year
        )
        countRow.push(data.count)
        amtRow.push(data.amount)
      })

      rows.push(countRow)
      rows.push(amtRow)
    })

    const safeLabel = currentMonthConfig.label.replace(/\s+/g, '_')
    downloadCsv(`Monthly_TXNs_Report_${safeLabel}`, headers, rows)
    setShowExportMenu(false)
    toast(`Exported Monthly TXN Report (${currentMonthConfig.label}) to CSV`)
  }

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Breadcrumb Trail matching Image: Workspace > Reports & MIS > TXN Data Report */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/reports" className="hover:text-[#0066FF] transition-colors">
          Reports & MIS
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">TXN Data Report</span>
      </div>

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-sm shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Monthly TXNs History
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              View transaction count and amount for each ATM with date-wise details.
            </p>
          </div>
        </div>

        {/* Action Buttons: Add Filter Option & Download */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => toast('Filter options are displayed below')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Filter size={14} className="text-[#0066FF]" />
            <span>Add Filter Option</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download size={14} className="text-[#0066FF]" />
              <span>Download</span>
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-30">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <FileText size={14} className="text-blue-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet size={14} className="text-emerald-500" />
                  <span>Export Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
            <Filter size={15} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to generate the monthly TXN report.
            </p>
          </div>
        </div>

        {/* 5 Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Month & Year * */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Month & Year <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={selectedMonthYearLabel}
                onChange={(e) => setSelectedMonthYearLabel(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                {MONTH_YEAR_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 2. Site ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All Sites</option>
                {siteOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 3. ATM ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All ATM</option>
                {atmOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 4. Model */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Model
            </label>
            <div className="relative">
              <Settings
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All Models</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 5. Franchisee Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Franchisee Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterFranchisee}
                onChange={(e) => setFilterFranchisee(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none cursor-pointer"
              >
                <option value="">All Franchisee</option>
                {franchiseeOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
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

        {/* Buttons Row */}
        <div className="mt-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm"
          >
            <Search size={14} />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-sm shrink-0">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              TXN Data Report - {currentMonthConfig.label}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>
              Total Records: <strong className="text-slate-900">{totalRecords}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-8 pl-3 pr-7 text-[12px] font-medium rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] appearance-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table with Horizontal Scrolling */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[2400px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12 text-center">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[110px] text-center">
                  ATM ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[110px] text-center">
                  Model
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[110px] text-center">
                  Cash Live Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[130px] text-center">
                  Site ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[170px] text-left">
                  Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[125px] bg-[#E8F1FC] text-slate-800 font-bold text-left">
                  Particulars
                </th>
                {dateColumns.map((colDate) => (
                  <th
                    key={colDate}
                    className="py-2.5 px-2 border-r border-[#D9E5F5] whitespace-nowrap min-w-[85px] text-center font-bold text-slate-800"
                  >
                    {colDate}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7 + dateColumns.length}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    No transaction records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const sNo = startIndex + idx + 1

                  // Precompute daily values for this ATM record
                  const dailyVals = dateColumns.map((_, dIdx) =>
                    getDailyTxnData(
                      rec.atmId,
                      dIdx + 1,
                      currentMonthConfig.month,
                      currentMonthConfig.year
                    )
                  )

                  return (
                    <tr
                      key={rec.atmId}
                      className="border-b border-slate-200 hover:bg-blue-50/20 transition-colors"
                    >
                      {/* Sub-table approach with 2 subrows: rowSpan={2} for common cells */}
                      <td
                        rowSpan={2}
                        className="py-2.5 px-3 text-center text-slate-500 font-medium whitespace-nowrap border-r border-b border-slate-200"
                      >
                        {sNo}
                      </td>
                      <td
                        rowSpan={2}
                        className="py-2.5 px-3 text-center font-semibold text-slate-900 whitespace-nowrap border-r border-b border-slate-200 font-mono"
                      >
                        {rec.atmId}
                      </td>
                      <td
                        rowSpan={2}
                        className="py-2.5 px-3 text-center text-slate-700 whitespace-nowrap border-r border-b border-slate-200"
                      >
                        {rec.model}
                      </td>
                      <td
                        rowSpan={2}
                        className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap border-r border-b border-slate-200 font-mono"
                      >
                        {rec.cashLiveDate}
                      </td>
                      <td
                        rowSpan={2}
                        className="py-2.5 px-3 text-center font-medium text-[#0066FF] whitespace-nowrap border-r border-b border-slate-200 font-mono"
                      >
                        {rec.siteId}
                      </td>
                      <td
                        rowSpan={2}
                        className="py-2.5 px-3 text-left font-medium text-slate-800 whitespace-nowrap border-r border-b border-slate-200"
                      >
                        {rec.name}
                      </td>

                      {/* Row 1: Particulars = TXN Count */}
                      <td className="py-2 px-3 text-left font-medium text-slate-800 bg-[#F0F6FD] border-r border-b border-slate-100 whitespace-nowrap">
                        TXN Count
                      </td>
                      {dailyVals.map((val, dIdx) => (
                        <td
                          key={`count-${dIdx}`}
                          className="py-2 px-2 text-center text-slate-700 font-medium border-r border-b border-slate-100 whitespace-nowrap"
                        >
                          {val.count}
                        </td>
                      ))}
                    </tr>
                  )
                }).flatMap((row, rIdx) => {
                  const rec = paginatedRecords[rIdx]
                  const dailyVals = dateColumns.map((_, dIdx) =>
                    getDailyTxnData(
                      rec.atmId,
                      dIdx + 1,
                      currentMonthConfig.month,
                      currentMonthConfig.year
                    )
                  )

                  // Return row 1 and row 2 for each record
                  const row2 = (
                    <tr
                      key={`${rec.atmId}-amt`}
                      className="border-b border-slate-200 hover:bg-blue-50/20 transition-colors"
                    >
                      {/* Row 2: Particulars = TXN Amount */}
                      <td className="py-2 px-3 text-left font-medium text-slate-800 bg-[#F0F6FD] border-r border-b border-slate-200 whitespace-nowrap">
                        TXN Amount
                      </td>
                      {dailyVals.map((val, dIdx) => (
                        <td
                          key={`amt-${dIdx}`}
                          className="py-2 px-2 text-center text-slate-600 font-mono text-[10.5px] border-r border-b border-slate-200 whitespace-nowrap"
                        >
                          {val.amount}
                        </td>
                      ))}
                    </tr>
                  )

                  return [row, row2]
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-t border-slate-200 gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalRecords > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalRecords}</span> records
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-7 h-7 px-2 rounded-md text-xs font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-[#0066FF] text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
