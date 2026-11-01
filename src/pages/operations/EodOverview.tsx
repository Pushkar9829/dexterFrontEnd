import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Filter,
  Search,
  RotateCcw,
  Download,
  Building2,
  User,
  Hash,
  MapPin,
  Calendar,
  FileCheck,
  FileSpreadsheet,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Check,
  ArrowUpDown,
  ArrowRight,
} from 'lucide-react'
import { SITES } from '@/data/cbrSites'
import { EOD_DATES, uploadStore, counterStore, uploadKey } from '@/data/cbr'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'

export default function EodOverview() {
  const uploads = uploadStore.use()
  const counters = counterStore.use()

  // Filter input states matching Image layout
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterUploadedBy, setFilterUploadedBy] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Applied Filters state
  const [appliedFilters, setAppliedFilters] = useState({
    atmId: '',
    siteId: '',
    location: '',
    date: '',
    uploadedBy: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })

  // Pagination & Page Size
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'atmId' | 'siteId' | 'location' | 'uploaded'>('date')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Dropdown options
  const atmOptions = useMemo(() => SITES.map((s) => s.atmId).sort(), [])
  const siteOptions = useMemo(() => SITES.map((s) => s.siteId).sort(), [])

  const handleSearch = () => {
    setAppliedFilters({
      atmId: filterAtmId,
      siteId: filterSiteId,
      location: filterLocation,
      date: filterDate,
      uploadedBy: filterUploadedBy,
      status: filterStatus,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    })
    setCurrentPage(1)
    toast('Filters applied to CBR EOD records')
  }

  const handleReset = () => {
    setFilterAtmId('')
    setFilterSiteId('')
    setFilterLocation('')
    setFilterDate('')
    setFilterUploadedBy('')
    setFilterStatus('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setAppliedFilters({
      atmId: '',
      siteId: '',
      location: '',
      date: '',
      uploadedBy: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  const handleSort = (field: 'date' | 'atmId' | 'siteId' | 'location' | 'uploaded') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const allRows = useMemo(() => {
    return EOD_DATES.slice()
      .reverse()
      .flatMap((d) =>
        SITES.map((s) => {
          const id = uploadKey(s.atmId, d)
          const up = uploads[id] || { uploaded: false }
          return {
            id,
            atmId: s.atmId,
            siteId: s.siteId,
            location: s.location,
            date: d,
            uploaded: !!up.uploaded,
            fileName: up.fileName || (up.uploaded ? `CBR_${s.atmId}_${d.replace(/-/g, '')}.xlsx` : '—'),
            uploadedOn: up.at ? new Date(up.at).toLocaleDateString('en-GB') : '—',
            uploadedBy: up.by || (up.uploaded ? 'Paras Dubey (Operations)' : '—'),
          }
        }),
      )
  }, [uploads])

  const filteredRecords = useMemo(() => {
    return allRows
      .filter((r) => {
        if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
        if (appliedFilters.siteId && r.siteId !== appliedFilters.siteId) return false
        if (
          appliedFilters.location &&
          !r.location.toLowerCase().includes(appliedFilters.location.toLowerCase())
        ) {
          return false
        }
        if (appliedFilters.date && !r.date.includes(appliedFilters.date)) return false
        if (
          appliedFilters.uploadedBy &&
          !r.uploadedBy.toLowerCase().includes(appliedFilters.uploadedBy.toLowerCase())
        ) {
          return false
        }
        if (appliedFilters.status === 'uploaded' && !r.uploaded) return false
        if (appliedFilters.status === 'pending' && r.uploaded) return false
        if (appliedFilters.dateFrom && r.date < appliedFilters.dateFrom) return false
        if (appliedFilters.dateTo && r.date > appliedFilters.dateTo) return false
        return true
      })
      .sort((a, b) => {
        const valA = (a[sortField] || '').toString().toLowerCase()
        const valB = (b[sortField] || '').toString().toLowerCase()
        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
      })
  }, [allRows, appliedFilters, sortField, sortAsc])

  // Pagination calculations
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  const handleMarkUploaded = (id: string, atmId: string) => {
    const at = new Date().toISOString()
    uploadStore.set((prev) => ({
      ...prev,
      [id]: {
        uploaded: true,
        fileName: `CBR_${atmId}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`,
        at,
        by: 'Paras Dubey',
      },
    }))
    toast(`Marked CBR uploaded for ${atmId}`)
  }

  const exportOverviewCsv = (records: typeof filteredRecords, name = 'cbr-eod-overview') => {
    const headers = ['S.N.', 'Date', 'ATM ID', 'Site ID', 'Location', 'Status', 'File Name', 'Uploaded On', 'Uploaded By']
    const rows = records.map((r, i) => [
      String(i + 1),
      r.date,
      r.atmId,
      r.siteId,
      r.location,
      r.uploaded ? 'Uploaded' : 'Pending',
      r.fileName,
      r.uploadedOn,
      r.uploadedBy,
    ])
    downloadCsv(name, headers, rows)
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
        <Link to="/operations" className="hover:text-[#0066FF] transition-colors">
          Operations
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <Link to="/operations/eod" className="hover:text-[#0066FF] transition-colors">
          EOD
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">Consolidated Report / Overview</span>
      </div>

      {/* ── Page Title Header matching Image ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            Consolidated Report / Overview
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Daily cash balance report upload status and physical counter clearance tracker across all ATMs.
          </p>
        </div>

        <div>
          <Link
            to="/cbr/consolidated"
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <span>Open CBR Register</span>
            <ArrowRight size={15} />
          </Link>
        </div>
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
              Use below filters to search and view CBR EOD records.
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

          {/* Row 1, Col 2: Site ID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Site ID
            </label>
            <div className="relative">
              <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select site ID</option>
                {siteOptions.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 1, Col 3: Location */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Location
            </label>
            <div className="relative">
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="Enter location"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 1, Col 4: Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              EOD Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 1, Col 5: Upload Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Upload Status
            </label>
            <div className="relative">
              <FileCheck size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="uploaded">Uploaded</option>
                <option value="pending">Pending</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2, Col 1: Uploaded By */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Uploaded By
            </label>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="Enter uploader name"
                value={filterUploadedBy}
                onChange={(e) => setFilterUploadedBy(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 2, Col 2: Date From */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Date From
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Row 2, Col 3: Date To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Date To
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                placeholder="dd-mm-yyyy"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
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
                    exportOverviewCsv(filteredRecords, 'cbr-eod-overview-filtered')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Export Filtered ({filteredRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportOverviewCsv(allRows, 'cbr-eod-overview-all')
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Export All ({allRows.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Data Card: Daily CBR EOD Upload Tracker matching Image ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Card Header with blue square icon */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <FileSpreadsheet size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900">
              Daily CBR EOD Upload Tracker
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
                  onClick={() => handleSort('date')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
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
                  onClick={() => handleSort('siteId')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Site ID</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('location')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('uploaded')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Attached File</th>
                <th className="py-2.5 px-3">Uploaded On</th>
                <th className="py-2.5 px-3">Uploaded By</th>
                <th className="py-2.5 px-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#334155]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No matching CBR upload records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                      {startIndex + i + 1}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">
                      {row.date}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-[#1E293B]">
                      {row.atmId}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                      {row.siteId}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {row.location}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {row.uploaded ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                          Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 truncate max-w-xs text-slate-600">
                      {row.fileName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                      {row.uploadedOn}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {row.uploadedBy}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {row.uploaded ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center justify-center gap-1">
                          <Check size={13} /> Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkUploaded(row.id, row.atmId)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors"
                        >
                          <span>Mark Uploaded</span>
                        </button>
                      )}
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

      {/* ── Secondary Card: CBR Last Counter Cleared Status ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <h3 className="text-[14.5px] font-bold text-slate-900">
                CBR Last Counter Cleared Status
              </h3>
            </div>
          </div>
          <span className="text-[12px] text-slate-500 font-medium">
            Monitoring {counters.length} registered ATMs
          </span>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#F0F5FA] border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-[#475569]">
                <th className="py-2.5 px-4">ATM ID</th>
                <th className="py-2.5 px-4">Make / Machine</th>
                <th className="py-2.5 px-4">EOD Recorded At</th>
                <th className="py-2.5 px-4">Last Counter Cleared</th>
                <th className="py-2.5 px-4">Cleared By</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counters.map((c) => (
                <tr key={c.atmId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#1E293B]">{c.atmId}</td>
                  <td className="py-2.5 px-4 text-slate-600">{c.make}</td>
                  <td className="py-2.5 px-4 text-slate-600">{c.eodAt.replace('T', ' ')}</td>
                  <td className="py-2.5 px-4 text-slate-600">{c.lastClear.replace('T', ' ')}</td>
                  <td className="py-2.5 px-4 text-slate-600">{c.by || 'Paras Dubey (Ops)'}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                      Cleared
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
