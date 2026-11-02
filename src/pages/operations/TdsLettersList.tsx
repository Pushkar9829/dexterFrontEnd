import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Plus,
  Filter,
  Download,
  Search,
  RotateCcw,
  Calendar,
  MapPin,
  Smartphone,
  Building2,
  Map,
  FileText,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  X,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react'
import {
  useTdsLetters,
  exportTdsCsv,
  type TdsLetterRecord,
} from '@/data/tdsLetters'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'

export default function TdsLettersList() {
  const navigate = useNavigate()
  const { isReport } = useReportMode()
  const { records, resetDummyData } = useTdsLetters()

  // Primary filters
  const [selectedMonth, setSelectedMonth] = useState('November 2026')
  const [filterSiteId, setFilterSiteId] = useState('All Sites')
  const [filterAtmId, setFilterAtmId] = useState('All ATM')
  const [filterFranchise, setFilterFranchise] = useState('All Franchise')
  const [filterState, setFilterState] = useState('All States')
  const [filterStatus, setFilterStatus] = useState('All Status')

  // Additional filter options (toggled by Add Filter Option)
  const [showExtraFilters, setShowExtraFilters] = useState(false)
  const [filterHitachiCode, setFilterHitachiCode] = useState('All Codes')
  const [filterAcStatus, setFilterAcStatus] = useState('All A/C Status')
  const [filterActionTaken, setFilterActionTaken] = useState('All Actions')

  // Download menu state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  // Scale state for fitting all columns in one window
  const [tableScale, setTableScale] = useState<'fit' | 'compact' | 'normal'>('fit')

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState({
    month: 'November 2026',
    siteId: 'All Sites',
    atmId: 'All ATM',
    franchise: 'All Franchise',
    state: 'All States',
    status: 'All Status',
    hitachiCode: 'All Codes',
    acStatus: 'All A/C Status',
    actionTaken: 'All Actions',
  })

  // Table pagination & sorting
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sortField, setSortField] = useState<keyof TdsLetterRecord>('clDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Preview modal state
  const [previewRecord, setPreviewRecord] = useState<TdsLetterRecord | null>(null)

  // Options for filter dropdowns
  const monthOptions = ['November 2026', 'October 2026', 'September 2026', 'August 2026', 'July 2026']
  const siteOptions = useMemo(() => ['All Sites', ...new Set(records.map((r) => r.siteId).filter(Boolean))], [records])
  const atmOptions = useMemo(() => ['All ATM', ...new Set(records.map((r) => r.atmId).filter(Boolean))], [records])
  const franchiseOptions = useMemo(() => ['All Franchise', ...new Set(records.map((r) => r.franchiseName).filter(Boolean))], [records])
  const stateOptions = useMemo(() => ['All States', ...new Set(records.map((r) => r.state).filter(Boolean))], [records])
  const statusOptions = ['All Status', 'Uploaded', 'Pending']

  const hitachiOptions = useMemo(() => ['All Codes', ...new Set(records.map((r) => r.hitachiCode).filter(Boolean))], [records])
  const acStatusOptions = useMemo(() => ['All A/C Status', ...new Set(records.map((r) => r.acStatus).filter(Boolean))], [records])
  const actionOptions = ['All Actions', 'Verified', 'Send Reminder', 'Review', 'Follow Up']

  const handleSearch = () => {
    setAppliedFilters({
      month: selectedMonth,
      siteId: filterSiteId,
      atmId: filterAtmId,
      franchise: filterFranchise,
      state: filterState,
      status: filterStatus,
      hitachiCode: filterHitachiCode,
      acStatus: filterAcStatus,
      actionTaken: filterActionTaken,
    })
    setCurrentPage(1)
    toast('Filters applied successfully')
  }

  const handleReset = () => {
    setSelectedMonth('November 2026')
    setFilterSiteId('All Sites')
    setFilterAtmId('All ATM')
    setFilterFranchise('All Franchise')
    setFilterState('All States')
    setFilterStatus('All Status')
    setFilterHitachiCode('All Codes')
    setFilterAcStatus('All A/C Status')
    setFilterActionTaken('All Actions')
    setAppliedFilters({
      month: 'November 2026',
      siteId: 'All Sites',
      atmId: 'All ATM',
      franchise: 'All Franchise',
      state: 'All States',
      status: 'All Status',
      hitachiCode: 'All Codes',
      acStatus: 'All A/C Status',
      actionTaken: 'All Actions',
    })
    setCurrentPage(1)
    toast('Filters reset to default')
  }

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (appliedFilters.month && r.month !== appliedFilters.month) return false
        if (appliedFilters.siteId !== 'All Sites' && r.siteId !== appliedFilters.siteId) return false
        if (appliedFilters.atmId !== 'All ATM' && r.atmId !== appliedFilters.atmId) return false
        if (appliedFilters.franchise !== 'All Franchise' && r.franchiseName !== appliedFilters.franchise) return false
        if (appliedFilters.state !== 'All States' && r.state !== appliedFilters.state) return false
        if (appliedFilters.status !== 'All Status' && r.uploadStatus !== appliedFilters.status) return false
        if (appliedFilters.hitachiCode !== 'All Codes' && r.hitachiCode !== appliedFilters.hitachiCode) return false
        if (appliedFilters.acStatus !== 'All A/C Status' && r.acStatus !== appliedFilters.acStatus) return false
        if (appliedFilters.actionTaken !== 'All Actions' && r.actionToBeTaken !== appliedFilters.actionTaken) return false
        return true
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? ''
        const valB = b[sortField] ?? ''
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
  }, [records, appliedFilters, sortField, sortDirection])

  // Pagination calculations
  const totalCount = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  const handleSort = (field: keyof TdsLetterRecord) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleExportCsv = () => {
    exportTdsCsv(filteredRecords, `tds-upload-status-${appliedFilters.month.replace(/\s+/g, '-')}`)
    setShowDownloadMenu(false)
    toast('Exported TDS report as CSV')
  }

  const handleExportExcel = () => {
    exportTdsCsv(filteredRecords, `tds-upload-status-${appliedFilters.month.replace(/\s+/g, '-')}`)
    setShowDownloadMenu(false)
    toast('Exported TDS report for Excel')
  }

  const handleDownloadSingle = (record: TdsLetterRecord) => {
    if (record.uploadStatus === 'Uploaded') {
      const fileName = record.uploadedDocuments?.[0]?.fileName || `TDS_Letter_${record.atmId}_${record.month.replace(/\s+/g, '_')}.pdf`
      const dummyContent = `TDS Certificate\nATM ID: ${record.atmId}\nFranchise: ${record.franchiseName}\nMonth: ${record.month}\nStatus: Verified`
      const blob = new Blob([dummyContent], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      toast(`Downloaded TDS Letter for ${record.atmId}`)
    } else {
      toast(`No TDS document uploaded yet for ${record.atmId}`, 'error')
    }
  }

  const handleSendReminder = (record: TdsLetterRecord) => {
    toast(`Reminder notification & SMS sent to ${record.franchiseName} (${record.contactNo})`)
  }

  return (
    <div className="w-full min-w-0 pb-12 font-sans space-y-3.5">
      {/* Breadcrumb */}
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
            <span className="font-semibold text-slate-800">TDS Letters & Compliance Report</span>
          </>
        ) : (
          <>
            <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
              Operations
            </Link>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">TDS Letters</span>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-0.5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[25px]">
            {isReport ? 'TDS Letters & Compliance Report' : 'TDS Letters – Monthly Upload Status'}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[#64748B]">
            {isReport
              ? 'View monthly TDS letters and compliance status report for all franchises.'
              : 'View and manage TDS letters uploaded by franchises for the selected month.'}
          </p>
        </div>

        {/* Top Right Action: + Upload TDS Letter */}
        {!isReport && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {records.length === 0 && (
              <button
                type="button"
                onClick={resetDummyData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                <RotateCcw size={13} className="text-[#0066FF]" /> Reset Data
              </button>
            )}

            <Link
              to="/operations/tds/upload"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.6} />
              <span>Upload TDS Letter</span>
            </Link>
          </div>
        )}
      </div>

      {/* Filter Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-4.5 shadow-xs">
        {/* Filter Card Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
            <Filter size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#1E293B]">Filter</h3>
            <p className="text-[11.5px] text-[#64748B]">
              Use below filters to search and manage TDS letter records.
            </p>
          </div>
        </div>

        {/* 6 Filter Inputs Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* 1. Month & Year * */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">
              Month & Year <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-[#0066FF]">
                <Calendar size={14} />
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-7 text-[12px] font-medium text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-[#64748B]" />
            </div>
          </div>

          {/* 2. Site ID */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">Site ID</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-[#0066FF]">
                <MapPin size={14} />
              </span>
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-7 text-[12px] font-medium text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                {siteOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-[#64748B]" />
            </div>
          </div>

          {/* 3. ATM ID */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">ATM ID</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-[#0066FF]">
                <Smartphone size={14} />
              </span>
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-7 text-[12px] font-medium text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                {atmOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-[#64748B]" />
            </div>
          </div>

          {/* 4. Franchise Name */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">Franchise Name</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-[#0066FF]">
                <Building2 size={14} />
              </span>
              <select
                value={filterFranchise}
                onChange={(e) => setFilterFranchise(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-7 text-[12px] font-medium text-[#1E293B] truncate focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                {franchiseOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-[#64748B]" />
            </div>
          </div>

          {/* 5. State */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">State</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-[#0066FF]">
                <Map size={14} />
              </span>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-7 text-[12px] font-medium text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                {stateOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-[#64748B]" />
            </div>
          </div>

          {/* 6. Upload Status */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#334155]">Upload Status</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2.5 text-[#0066FF]">
                <FileText size={14} />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-7 text-[12px] font-medium text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
              >
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 text-[#64748B]" />
            </div>
          </div>
        </div>

        {/* Optional Expanded Filters (opened via Add Filter Option) */}
        {showExtraFilters && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">Hitachi Code</label>
              <select
                value={filterHitachiCode}
                onChange={(e) => setFilterHitachiCode(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white py-1.5 px-2.5 text-[12px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
              >
                {hitachiOptions.map((hc) => (
                  <option key={hc} value={hc}>{hc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">A/C Status</label>
              <select
                value={filterAcStatus}
                onChange={(e) => setFilterAcStatus(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white py-1.5 px-2.5 text-[12px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
              >
                {acStatusOptions.map((ac) => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">Action to be Taken</label>
              <select
                value={filterActionTaken}
                onChange={(e) => setFilterActionTaken(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white py-1.5 px-2.5 text-[12px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
              >
                {actionOptions.map((act) => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filter Action Line (Shifted here as per annotation) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-50">
          {/* Add Filter Option Button */}
          <button
            type="button"
            onClick={() => setShowExtraFilters((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all shadow-xs cursor-pointer ${showExtraFilters
              ? 'border-[#0066FF] bg-blue-50/50 text-[#0066FF]'
              : 'border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-50'
              }`}
          >
            <Filter size={13} className="text-[#0066FF]" />
            <span>{showExtraFilters ? 'Hide Extra Filters' : 'Add Filter Option'}</span>
          </button>

          {/* Download Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#334155] hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            >
              <Download size={13} className="text-[#0066FF]" />
              <span>Download</span>
              <ChevronDown size={12} className="text-[#64748B] ml-0.5" />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-30">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Download as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={14} className="text-[#0066FF]" />
                  <span>Download as Excel</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadMenu(false)
                    toast('Preparing ZIP of all TDS documents for November 2026...')
                  }}
                  className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50/60 hover:text-[#0066FF] flex items-center gap-2 cursor-pointer"
                >
                  <Download size={14} className="text-amber-600" />
                  <span>All Letters (ZIP)</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] px-4 py-1.5 text-[12px] font-semibold text-white transition-all shadow-xs cursor-pointer"
          >
            <Search size={13} />
            <span>Search</span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#334155] hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw size={13} className="text-[#64748B]" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {/* Table Card Header with Fit to Window Scale Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-[#E2E8F0] gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
              <FileSpreadsheet size={15} />
            </div>
            <h2 className="text-[14px] font-bold text-[#1E293B]">
              TDS Letters Upload Status – {appliedFilters.month}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Window Scale Control */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#CBD5E1]/60 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setTableScale('fit')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${tableScale === 'fit' ? 'bg-[#0066FF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                title="Fit all 14 columns into window without scroll"
              >
                Fit Window
              </button>
              <button
                type="button"
                onClick={() => setTableScale('compact')}
                className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${tableScale === 'compact' ? 'bg-[#0066FF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                title="Compact 92% scale"
              >
                92%
              </button>
              <button
                type="button"
                onClick={() => setTableScale('normal')}
                className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${tableScale === 'normal' ? 'bg-[#0066FF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                title="100% normal scale"
              >
                100%
              </button>
            </div>

            <span className="text-[12px] font-medium text-[#64748B]">
              Total Records: <strong className="text-[#1E293B]">{totalCount}</strong>
            </span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="appearance-none rounded-lg border border-[#CBD5E1] bg-white py-0.5 pl-2.5 pr-6 text-[11.5px] font-semibold text-[#334155] focus:border-[#0066FF] focus:outline-hidden cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B]" />
            </div>
          </div>
        </div>

        {/* Scaled Table Container: Configured to fit all 14 columns in window */}
        <div
          className="overflow-x-auto scroll-thin w-full transition-all"
          style={{
            zoom: tableScale === 'fit' ? 0.88 : tableScale === 'compact' ? 0.92 : 1,
          }}
        >
          <table className="w-full text-left border-collapse table-auto text-[11px] 2xl:text-[11.5px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold uppercase tracking-tight text-[#475569]">
                <th className="py-2.5 px-2 text-center w-8">S.N.</th>
                <th
                  onClick={() => handleSort('month')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Month</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hitachiCode')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Hitachi Code</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('atmId')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>ATM ID</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('locationName')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('franchiseName')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Franchise Name</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('contactNo')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Contact No.</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('state')}
                  className="py-2.5 px-1.5 text-center cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap w-9"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>State</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('clDate')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>CL Date</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('acStatus')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>A/C Status</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('uploadStatus')}
                  className="py-2.5 px-2 text-center cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Upload Status</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('remark')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Remark</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('actionToBeTaken')}
                  className="py-2.5 px-2 cursor-pointer select-none hover:text-[#0066FF] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Action Taken</span>
                    <ArrowUpDown size={10} className="text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-2.5 px-2 text-center w-14 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Action</span>
                    <ChevronRight size={11} className="text-[#94A3B8]" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-slate-400">
                    <FileText size={28} className="mx-auto mb-1.5 text-slate-300" />
                    <p className="font-medium text-slate-600 text-[12px]">No records found matching filters</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting or modifying filter criteria</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const serialNum = (currentPage - 1) * pageSize + idx + 1
                  const isUploaded = r.uploadStatus === 'Uploaded'

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-2 px-2 text-center text-[#64748B] font-medium">{serialNum}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#1E293B] font-medium">{r.month}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#475569]">{r.hitachiCode || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap font-semibold text-[#1E293B]">{r.atmId || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#475569]">{r.locationName || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap font-medium text-[#1E293B]">{r.franchiseName || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#64748B]">{r.contactNo || '—'}</td>
                      <td className="py-2 px-1.5 text-center whitespace-nowrap text-[#475569] font-medium">{r.state || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#64748B]">{r.clDate || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#475569]">{r.acStatus || '—'}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isUploaded ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                            Uploaded
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-[#64748B]">{r.remark || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap font-semibold">
                        {r.actionToBeTaken === 'Verified' && (
                          <span className="text-[#16A34A]">Verified</span>
                        )}
                        {r.actionToBeTaken === 'Send Reminder' && (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(r)}
                            className="text-[#D97706] hover:underline cursor-pointer font-semibold flex items-center gap-1"
                          >
                            <span>Send Reminder</span>
                          </button>
                        )}
                        {r.actionToBeTaken === 'Review' && (
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(r)}
                            className="text-[#0066FF] hover:underline cursor-pointer font-semibold flex items-center gap-1"
                          >
                            <span>Review</span>
                          </button>
                        )}
                        {r.actionToBeTaken === 'Follow Up' && (
                          <button
                            type="button"
                            onClick={() => toast(`Follow-up ticket raised for ${r.franchiseName}`)}
                            className="text-[#DC2626] hover:underline cursor-pointer font-semibold flex items-center gap-1"
                          >
                            <span>Follow Up</span>
                          </button>
                        )}
                        {!['Verified', 'Send Reminder', 'Review', 'Follow Up'].includes(r.actionToBeTaken) && (
                          <span>{r.actionToBeTaken || '—'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(r)}
                            title="View TDS Letter"
                            className="p-1 rounded text-[#0066FF] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(r)}
                            title="Download TDS Letter"
                            className="p-1 rounded text-[#0066FF] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[#E2E8F0] gap-2.5 bg-white">
          <div className="text-[12px] text-[#64748B]">
            Showing <strong className="text-[#1E293B]">{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-[#1E293B]">{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
            <strong className="text-[#1E293B]">{totalCount}</strong> records
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${currentPage === pageNum
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-50'
                  }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* TDS Letter Document Preview Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF] text-white">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">
                    TDS Certificate Preview – {previewRecord.atmId}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    {previewRecord.franchiseName} • {previewRecord.month}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Document Status Banner */}
              <div className="flex items-center justify-between rounded-xl bg-blue-50/70 p-3.5 border border-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#0066FF]" />
                  <div>
                    <span className="text-[13px] font-bold text-slate-800">
                      Status: {previewRecord.uploadStatus}
                    </span>
                    <p className="text-[11.5px] text-slate-600">
                      Remark: {previewRecord.remark || 'N/A'} • Action: {previewRecord.actionToBeTaken}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  CL Date: {previewRecord.clDate}
                </span>
              </div>

              {/* ATM & Franchise Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 text-[12px]">
                <div>
                  <span className="text-slate-500 block text-[11px]">Site ID</span>
                  <span className="font-semibold text-slate-800">{previewRecord.siteId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Hitachi Code</span>
                  <span className="font-semibold text-slate-800">{previewRecord.hitachiCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">State</span>
                  <span className="font-semibold text-slate-800">{previewRecord.state || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">A/C Status</span>
                  <span className="font-semibold text-slate-800">{previewRecord.acStatus || 'N/A'}</span>
                </div>
              </div>

              {/* Mock Certificate Canvas */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mx-auto">
                    <FileText size={26} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-900 uppercase tracking-wide">
                      Form 16A / TDS Certificate
                    </h4>
                    <p className="text-[12px] text-slate-500">
                      Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source
                    </p>
                  </div>
                  <div className="text-[12px] text-slate-700 bg-slate-50 p-3 rounded-lg max-w-md mx-auto text-left space-y-1">
                    <p><strong>Deductor:</strong> Dexter Financial Solutions Pvt Ltd</p>
                    <p><strong>Deductee:</strong> {previewRecord.franchiseName}</p>
                    <p><strong>ATM Terminal:</strong> {previewRecord.atmId} ({previewRecord.locationName})</p>
                    <p><strong>Assessment Period:</strong> {previewRecord.month}</p>
                    <p><strong>Attached File:</strong> {previewRecord.uploadedDocuments?.[0]?.fileName || `TDS_Certificate_${previewRecord.atmId}.pdf`}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/60">
              <button
                type="button"
                onClick={() => {
                  setPreviewRecord(null)
                  navigate('/operations/tds/upload')
                }}
                className="text-[12.5px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
              >
                + Re-upload / Replace Document
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadSingle(previewRecord)
                    setPreviewRecord(null)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] px-4 py-2 text-[12.5px] font-semibold text-white cursor-pointer shadow-xs"
                >
                  <Download size={14} />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
