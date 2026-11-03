import { useState, useMemo, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  Mail,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { RpRollsIcon } from '@/components/icons/RpRollsIcon'
import {
  type RpRollRecord,
  getStoredRpRolls,
  saveStoredRpRolls,
  resetStoredRpRolls,
  STATES_LIST,
  DELIVERY_STATUSES,
} from '@/data/rpRolls'

type SortField = keyof RpRollRecord
type SortOrder = 'asc' | 'desc'

export default function RpRollsList() {
  const navigate = useNavigate()

  // Data state
  const [records, setRecords] = useState<RpRollRecord[]>(() => getStoredRpRolls())

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('sn')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)


  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('All States')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [dateRange, setDateRange] = useState('')

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailRemarks, setEmailRemarks] = useState('')

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [showFilterModal, setShowFilterModal] = useState(false)
  const [extraFilterCourier, setExtraFilterCourier] = useState('All')
  const [extraFilterPin, setExtraFilterPin] = useState('')

  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<RpRollRecord | null>(null)

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    const res = records.filter((rec) => {
      // Empty row filter check
      const isEmpty = !rec.atmId && !rec.franchiseeName && !rec.despatchChallanNo
      if (isEmpty) return false

      // Search ATM ID or Franchisee Name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchAtm = rec.atmId.toLowerCase().includes(q)
        const matchName = rec.franchiseeName.toLowerCase().includes(q)
        const matchFr = rec.frName.toLowerCase().includes(q)
        const matchChallan = rec.despatchChallanNo.toLowerCase().includes(q)
        const matchDocket = rec.docketNo.toLowerCase().includes(q)
        if (!matchAtm && !matchName && !matchFr && !matchChallan && !matchDocket) return false
      }

      // State filter
      if (selectedState !== 'All States') {
        if (rec.state.toUpperCase() !== selectedState.toUpperCase()) return false
      }

      // Status filter
      if (selectedStatus !== 'All Status') {
        const statusVal = rec.remarks || rec.status || ''
        if (statusVal.toLowerCase() !== selectedStatus.toLowerCase()) return false
      }

      // Extra Courier filter
      if (extraFilterCourier !== 'All') {
        if (rec.dispatchedViaCourierName !== extraFilterCourier) return false
      }

      // Extra PIN filter
      if (extraFilterPin.trim()) {
        if (!rec.pinCode.includes(extraFilterPin.trim())) return false
      }

      return true
    })

    // Sort
    res.sort((a, b) => {
      const valA = a[sortField] ?? ''
      const valB = b[sortField] ?? ''

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })

    return res
  }, [
    records,
    searchQuery,
    selectedState,
    selectedStatus,
    extraFilterCourier,
    extraFilterPin,
    sortField,
    sortOrder,
  ])

  // Pagination calculation
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  // Delete Record
  const handleDeleteRow = (id: string, atmId: string) => {
    if (window.confirm(`Are you sure you want to remove dispatch record for ${atmId || 'this ATM'}?`)) {
      const updated = records.filter((r) => r.id !== id)
      setRecords(updated)
      saveStoredRpRolls(updated)
      toast(`Record for ATM ${atmId} deleted successfully`, 'info')
    }
  }

  // Handle Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedState('All States')
    setSelectedStatus('All Status')
    setDateRange('')
    setExtraFilterCourier('All')
    setExtraFilterPin('')
    setCurrentPage(1)
    toast('Filters reset to default', 'info')
  }

  // Reset all records to original
  const handleResetAllData = () => {
    const defaultData = resetStoredRpRolls()
    setRecords(defaultData)
    setCurrentPage(1)
    toast('Data restored to initial template', 'info')
  }

  // Export CSV
  const handleDownloadCsv = (type: 'csv' | 'excel' = 'csv') => {
    const headers = [
      'S.N.',
      'ATM ID',
      'Franchisee Name',
      'Hub Locations',
      'FR Name',
      'FR Address with PIN Code',
      'FR Number',
      'State',
      'Pin Code',
      'Despatch Challan No',
      'Dispatched Via Courier Name',
      'Docket No',
      'Dispatch Date',
      'Delivery Status (Date)',
      'Status / Remarks',
    ]

    const rows = filteredRecords.map((r, i) => [
      String(i + 1),
      r.atmId,
      r.franchiseeName,
      r.hubLocations,
      r.frName,
      r.frAddressWithPin,
      r.frNumber,
      r.state,
      r.pinCode,
      r.despatchChallanNo,
      r.dispatchedViaCourierName,
      r.docketNo,
      r.dispatchDate,
      r.deliveryStatusDate,
      r.remarks || r.status || '',
    ])

    downloadCsv(`RP_Rolls_Consolidated_${type === 'excel' ? 'Excel' : 'Data'}`, headers, rows)
    setShowDownloadMenu(false)
    toast(`RP Rolls report downloaded as ${type === 'excel' ? 'Excel-ready CSV' : 'CSV'}`, 'success')
  }

  // Handle Email send
  const handleSendEmail = (e: FormEvent) => {
    e.preventDefault()
    if (!emailTo) {
      toast('Please enter a recipient email address', 'error')
      return
    }
    toast(`Consolidated RP Rolls report dispatched to ${emailTo}`, 'success')
    setShowEmailModal(false)
    setEmailTo('')
    setEmailRemarks('')
  }

  // Handle Bulk Upload
  const handleBulkUploadSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      toast('Please choose a valid CSV or Excel file', 'error')
      return
    }

    toast(`File "${uploadFile.name}" uploaded and parsed successfully!`, 'success')
    setShowUploadModal(false)
    setUploadFile(null)
  }

  // Helper for Status Badge styling matching other Dexter pages
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('deliver')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Delivered
        </span>
      )
    }
    if (s.includes('transit')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          In Transit
        </span>
      )
    }
    if (s.includes('out')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Out for Delivery
        </span>
      )
    }
    if (s.includes('dispatch')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Dispatched
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {status || 'Pending'}
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-16 font-sans">
      {/* 1. Breadcrumb: [Home Icon] Workspace > Operations > RP Rolls */}
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[12px]">
        <Home size={15} className="text-[#0066FF] shrink-0" />
        <Link to="/dashboard" className="text-[#0066FF] hover:underline font-medium">
          Workspace
        </Link>
        <span className="text-[#94A3B8] font-normal">&gt;</span>
        <Link to="/operations" className="text-[#0066FF] hover:underline font-medium">
          Operations
        </Link>
        <span className="text-[#94A3B8] font-normal">&gt;</span>
        <span className="text-[#0066FF] font-semibold">RP Rolls</span>
      </nav>

      {/* 2. Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3.5">
          {/* Blue Rounded Square with RP Rolls Icon */}
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0066FF] text-white shadow-md shadow-blue-500/20 shrink-0">
            <RpRollsIcon size={24} color="#FFFFFF" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">RP Rolls</h1>
            <p className="mt-0.5 text-[12.5px] text-[#64748B]">
              Manage RP roll dispatch, courier and delivery details.
            </p>
          </div>
        </div>

        {/* Top-Right Action Button: RP Roll Request */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/operations/rp-rolls/entry')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-bold transition-all shadow-sm hover:shadow cursor-pointer border border-[#0066FF]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>RP Roll Request</span>
          </button>
        </div>
      </div>

      {/* 3. Filters Toolbar Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          {/* Filter 1: Search by ATM ID / Franchise Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Search by ATM ID / Franchise Name
            </label>
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-[#0066FF] shrink-0 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Enter ATM ID or Franchise Name"
                className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter 2: Month / Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Month / Date Range
            </label>
            <div className="relative flex items-center">
              <Calendar size={14} className="absolute left-3 text-[#0066FF] shrink-0 pointer-events-none" />
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="Select Month / Date Range"
                className="w-full h-9.5 pl-9 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none shadow-2xs transition-all cursor-pointer"
              />
              <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Filter 3: State */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              State
            </label>
            <div className="relative">
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-9.5 pl-3 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none shadow-2xs appearance-none cursor-pointer"
              >
                {STATES_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st === 'All States' ? 'All States' : st}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Filter 4: Delivery Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Delivery Status
            </label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-9.5 pl-3 pr-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none shadow-2xs appearance-none cursor-pointer"
              >
                {DELIVERY_STATUSES.map((stat) => (
                  <option key={stat} value={stat}>
                    {stat}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          {/* Search Button */}
          <button
            type="button"
            onClick={() => toast(`Search filtered ${filteredRecords.length} record(s)`, 'info')}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Search size={14} />
            Search
          </button>

          {/* Add Filter Option Button */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Filter size={13} className="text-[#0066FF]" />
            Add Filter Option
          </button>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu((o) => !o)}
              className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Download size={13} className="text-[#0066FF]" />
              <span>Download</span>
              <ChevronDown size={12} className="text-slate-400 ml-0.5" />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-30">
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('csv')}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-blue-50/70"
                >
                  <FileSpreadsheet size={14} className="text-[#0066FF]" />
                  Download as CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('excel')}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-blue-50/70"
                >
                  <FileText size={14} className="text-emerald-600" />
                  Download for Excel
                </button>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw size={13} className="text-slate-600" />
            Reset
          </button>
        </div>
      </div>

      {/* 4. Table Section Card matching other Dexter list pages */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-5">
        {/* Table Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet size={16} />
            </div>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-800">
              RP Rolls - Consolidated Data
            </h2>
          </div>

          <div className="flex items-center gap-3">

            <span className="text-[12.5px] font-bold text-slate-700">
              Total Records : {totalRecords}
            </span>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-2.5 pr-6 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 bg-white focus:border-[#0066FF] outline-none appearance-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Scaled Table Container */}
        <div
          className="overflow-x-auto scroll-thin w-full transition-all"
        >
          <table className="w-full border-collapse text-left text-[11.5px]">
            <thead>
              <tr className="border-b border-blue-100 bg-[#EAF2FD] text-[11px] font-bold text-slate-800 whitespace-nowrap">
                <th className="py-2.5 px-3 text-center w-12 border-r border-blue-100/60">
                  S.N.
                </th>
                <th
                  onClick={() => handleSort('atmId')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[95px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ATM ID</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('franchiseeName')}
                  className="py-2.5 px-3 text-left border-r border-blue-100/60 min-w-[150px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Franchisee Name</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hubLocations')}
                  className="py-2.5 px-3 text-left border-r border-blue-100/60 min-w-[160px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Hub Locations</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('frName')}
                  className="py-2.5 px-3 text-left border-r border-blue-100/60 min-w-[190px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>FR Name</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-left border-r border-blue-100/60 min-w-[240px]">
                  FR Address with PIN Code
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[105px]">
                  FR Number
                </th>
                <th
                  onClick={() => handleSort('state')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[110px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>State</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[75px]">
                  Pin Code
                </th>
                <th
                  onClick={() => handleSort('despatchChallanNo')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[125px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Despatch Challan</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dispatchedViaCourierName')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[120px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Courier Name</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[110px]">
                  Docket No
                </th>
                <th
                  onClick={() => handleSort('dispatchDate')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[95px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Dispatch Date</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('deliveryStatusDate')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[105px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Delivery Date</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('remarks')}
                  className="py-2.5 px-3 text-center border-r border-blue-100/60 min-w-[115px] cursor-pointer hover:bg-blue-100/50 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status / Remarks</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-[#EAF2FD] shadow-[-2px_0_4px_rgba(0,0,0,0.04)] min-w-[85px]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 text-[13px]">
                    No RP rolls records found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1

                  return (
                    <tr
                      key={r.id || index}
                      className="group hover:bg-blue-50/30 transition-colors text-center whitespace-nowrap"
                    >
                      {/* S.N. */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                        {rowNumber}
                      </td>

                      {/* ATM ID */}
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => setViewingRecord(r)}
                          className="font-bold text-[#0066FF] hover:underline cursor-pointer"
                        >
                          {r.atmId}
                        </button>
                      </td>

                      {/* Franchisee Name */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-100 text-left">
                        {r.franchiseeName}
                      </td>

                      {/* Hub Locations */}
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100 text-left">
                        {r.hubLocations}
                      </td>

                      {/* FR Name */}
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100 text-left">
                        {r.frName}
                      </td>

                      {/* FR Address with PIN Code */}
                      <td className="py-2.5 px-3 border-r border-slate-100 text-left max-w-[260px] truncate">
                        <button
                          type="button"
                          onClick={() => setViewingRecord(r)}
                          className="text-[#0066FF] hover:underline cursor-pointer flex items-center gap-1 truncate text-[11px]"
                          title={r.frAddressWithPin}
                        >
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{r.frAddressWithPin}</span>
                        </button>
                      </td>

                      {/* FR Number */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-100">
                        {r.frNumber}
                      </td>

                      {/* State */}
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                        {r.state}
                      </td>

                      {/* Pin Code */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-100">
                        {r.pinCode}
                      </td>

                      {/* Despatch Challan No */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-100">
                        {r.despatchChallanNo}
                      </td>

                      {/* Courier Name */}
                      <td className="py-2.5 px-3 font-medium text-slate-700 border-r border-slate-100">
                        {r.dispatchedViaCourierName}
                      </td>

                      {/* Docket No */}
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <span className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          {r.docketNo}
                        </span>
                      </td>

                      {/* Dispatch Date */}
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                        {r.dispatchDate}
                      </td>

                      {/* Delivery Date */}
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-100">
                        {r.deliveryStatusDate}
                      </td>

                      {/* Status / Remarks */}
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        {renderStatusBadge(r.remarks || r.status || '')}
                      </td>

                      {/* Sticky Action Column matching CashReplenishment / Dexter list pages */}
                      <td className="py-2 px-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-[#f6faff] shadow-[-2px_0_4px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingRecord(r)}
                            className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="View Dispatch Details"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate('/operations/rp-rolls/entry')}
                            className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit Entry"
                          >
                            <Edit2 size={13.5} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRow(r.id, r.atmId)}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={13.5} />
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

        {/* 5. Pagination Footer matching Image 01 & CashReplenishment.tsx */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 text-[12px] text-slate-600 bg-white">
          {/* Show X entries */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 pl-2.5 pr-6 rounded border border-slate-200 text-[12px] font-medium text-slate-800 bg-white focus:border-[#0066FF] outline-none appearance-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <span>entries</span>
          </div>

          {/* Showing X to Y of Z entries + Buttons < 1 2 3 > */}
          <div className="flex items-center gap-3">
            <span>
              Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1
                const isActive = pageNum === currentPage
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded text-[12px] font-semibold transition-colors cursor-pointer ${isActive
                      ? 'bg-[#0066FF] text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Action Bar matching Dexter standards */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleResetAllData}
          className="text-[12px] text-slate-500 hover:text-[#0066FF] underline font-medium cursor-pointer"
        >
          Restore Initial Template Data
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Email Button */}
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[12.5px] font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Mail size={14} className="text-[#0066FF]" />
            Email
          </button>

          {/* Bulk Upload Button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[12.5px] font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <UploadCloud size={14} className="text-[#0066FF]" />
            Bulk Upload
          </button>

          {/* New Entry Button */}
          <button
            type="button"
            onClick={() => navigate('/operations/rp-rolls/entry')}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.6} />
            New Roll Entry
          </button>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#0066FF]">
                  <RpRollsIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-slate-900">
                    RP Roll Dispatch: {viewingRecord.atmId}
                  </h3>
                  <p className="text-[11.5px] text-slate-500">
                    {viewingRecord.franchiseeName} • {viewingRecord.hubLocations}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-[12.5px]">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Challan No.</span>
                  <span className="font-bold text-slate-900">{viewingRecord.despatchChallanNo}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Courier & Docket</span>
                  <span className="font-mono text-slate-800">
                    {viewingRecord.dispatchedViaCourierName} ({viewingRecord.docketNo})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Dispatch Date</span>
                  <span className="text-slate-800">{viewingRecord.dispatchDate}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Delivery Status</span>
                  <div>{renderStatusBadge(viewingRecord.remarks || viewingRecord.status || '')}</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  FR Delivery Address
                </span>
                <p className="p-3 bg-blue-50/50 rounded-lg text-slate-800 text-[12px] leading-relaxed border border-blue-100">
                  {viewingRecord.frAddressWithPin}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-[12px]">
                <div>
                  <span className="text-[11px] text-slate-500 block">State</span>
                  <span className="font-medium text-slate-800">{viewingRecord.state}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Pin Code</span>
                  <span className="font-mono font-medium text-slate-800">{viewingRecord.pinCode}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">FR Contact</span>
                  <span className="font-mono text-slate-800">{viewingRecord.frNumber}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewingRecord(null)
                  navigate('/operations/rp-rolls/entry')
                }}
                className="text-[12px] font-semibold text-[#0066FF] hover:underline flex items-center gap-1"
              >
                <Edit2 size={12} /> Edit Entry
              </button>

              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="rounded-lg bg-[#0066FF] text-white px-4 py-2 text-[12.5px] font-semibold hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-[#0066FF]" />
                <h3 className="font-bold text-[16px] text-slate-900">Email RP Rolls Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="e.g. operations@dexter.com, logistics@dtdc.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Additional Notes / Remarks
                </label>
                <textarea
                  rows={3}
                  value={emailRemarks}
                  onChange={(e) => setEmailRemarks(e.target.value)}
                  placeholder="Enter dispatch notes, recipient instructions, or references..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-[13px] outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="rounded-lg bg-blue-50/80 p-3 text-[11.5px] text-blue-800">
                The consolidated RP rolls CSV data and active dispatches will be attached automatically to this email.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0066FF] px-5 py-2 text-[12.5px] font-bold text-white hover:bg-blue-600 shadow-xs"
                >
                  Send Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UploadCloud size={20} className="text-[#0066FF]" />
                <h3 className="font-bold text-[16px] text-slate-900">Bulk Upload RP Rolls</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkUploadSubmit} className="mt-4 space-y-4">
              <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-6 text-center hover:bg-blue-50/50 transition-colors">
                <FileSpreadsheet size={36} className="mx-auto text-[#0066FF] mb-2" />
                <p className="text-[13px] font-medium text-slate-900">
                  Upload CSV or Excel sheet (.csv, .xlsx)
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Max file size up to 10 MB</p>

                <label className="mt-3 inline-block cursor-pointer rounded-lg bg-[#0066FF] px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-600">
                  Select File
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0])
                      }
                    }}
                  />
                </label>

                {uploadFile && (
                  <p className="mt-2 text-[12px] font-semibold text-emerald-600">
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11.5px] text-slate-500">
                <span>Need the standard template?</span>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('csv')}
                  className="font-semibold text-[#0066FF] hover:underline"
                >
                  Download Sample CSV
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0066FF] px-5 py-2 text-[12.5px] font-bold text-white hover:bg-blue-600 shadow-xs"
                >
                  Upload & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Filter Option Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-[#0066FF]" />
                <h3 className="font-bold text-[16px] text-slate-900">Additional Filter Options</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Filter by Courier Name
                </label>
                <select
                  value={extraFilterCourier}
                  onChange={(e) => setExtraFilterCourier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800 outline-none focus:border-[#0066FF]"
                >
                  <option value="All">All Couriers</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Speed Post">Speed Post</option>
                  <option value="Professional Couriers">Professional Couriers</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Filter by PIN Code
                </label>
                <input
                  type="text"
                  value={extraFilterPin}
                  onChange={(e) => setExtraFilterPin(e.target.value)}
                  placeholder="e.g. 205001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[12.5px] text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setExtraFilterCourier('All')
                    setExtraFilterPin('')
                    setShowFilterModal(false)
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Clear Extra Filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterModal(false)
                    toast('Additional filters applied', 'info')
                  }}
                  className="rounded-lg bg-[#0066FF] px-5 py-2 text-[12.5px] font-bold text-white hover:bg-blue-600"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
