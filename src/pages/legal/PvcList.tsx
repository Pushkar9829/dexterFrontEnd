import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Plus,
  Filter,
  Building2,
  Monitor,
  User,
  Phone,
  Box,
  Calendar,
  ListFilter,
  Search,
  RotateCcw,
  Download,
  ChevronDown,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react'
import { usePvcRecords, deletePvcRecord, type PvcStatus } from '@/data/legalPvc'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'

export default function PvcList() {
  const { records } = usePvcRecords()

  // Filter States
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterFranchise, setFilterFranchise] = useState('')
  const [filterMobile, setFilterMobile] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPvcFrom, setFilterPvcFrom] = useState('')
  const [filterPvcTo, setFilterPvcTo] = useState('')
  const [filterExpFrom, setFilterExpFrom] = useState('')
  const [filterExpTo, setFilterExpTo] = useState('')

  // Applied Filter States
  const [appliedFilters, setAppliedFilters] = useState({
    siteId: '',
    atmId: '',
    franchise: '',
    mobile: '',
    model: '',
    status: '',
    pvcFrom: '',
    pvcTo: '',
    expFrom: '',
    expTo: '',
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Unique options for dropdowns
  const siteOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.siteId))).filter(Boolean),
    [records]
  )
  const atmOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.atmId))).filter(Boolean),
    [records]
  )
  const franchiseOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.franchiseName))).filter(Boolean),
    [records]
  )
  const modelOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.model))).filter(Boolean),
    [records]
  )

  const handleSearch = () => {
    setAppliedFilters({
      siteId: filterSiteId,
      atmId: filterAtmId,
      franchise: filterFranchise,
      mobile: filterMobile,
      model: filterModel,
      status: filterStatus,
      pvcFrom: filterPvcFrom,
      pvcTo: filterPvcTo,
      expFrom: filterExpFrom,
      expTo: filterExpTo,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFilterSiteId('')
    setFilterAtmId('')
    setFilterFranchise('')
    setFilterMobile('')
    setFilterModel('')
    setFilterStatus('')
    setFilterPvcFrom('')
    setFilterPvcTo('')
    setFilterExpFrom('')
    setFilterExpTo('')
    setAppliedFilters({
      siteId: '',
      atmId: '',
      franchise: '',
      mobile: '',
      model: '',
      status: '',
      pvcFrom: '',
      pvcTo: '',
      expFrom: '',
      expTo: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  const handleExport = () => {
    downloadCsv(
      'police-verification-certificates',
      [
        'S.N.',
        'Site ID',
        'ATM ID',
        'Franchise Name',
        'Mobile Number',
        'Model',
        'PVC Date',
        'Expiry Date',
        'Status',
        'Remark',
      ],
      filteredRecords.map((r) => [
        String(r.sn),
        r.siteId,
        r.atmId,
        r.franchiseName,
        r.mobileNumber,
        r.model,
        r.pvcDate,
        r.expiryDate,
        r.status,
        r.remark,
      ])
    )
    toast('PVC records exported successfully')
  }

  const handleDelete = (id: string, siteId: string) => {
    if (confirm(`Are you sure you want to delete PVC record for ${siteId}?`)) {
      deletePvcRecord(id)
      toast('Record deleted')
    }
  }

  // Filtered List
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (appliedFilters.siteId && r.siteId !== appliedFilters.siteId) return false
      if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
      if (appliedFilters.franchise && r.franchiseName !== appliedFilters.franchise) return false
      if (appliedFilters.mobile && !r.mobileNumber.toLowerCase().includes(appliedFilters.mobile.toLowerCase())) return false
      if (appliedFilters.model && r.model !== appliedFilters.model) return false
      if (appliedFilters.status && r.status !== appliedFilters.status) return false
      if (appliedFilters.pvcFrom && r.pvcDate < appliedFilters.pvcFrom) return false
      if (appliedFilters.pvcTo && r.pvcDate > appliedFilters.pvcTo) return false
      if (appliedFilters.expFrom && r.expiryDate < appliedFilters.expFrom) return false
      if (appliedFilters.expTo && r.expiryDate > appliedFilters.expTo) return false
      return true
    })
  }, [records, appliedFilters])

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  const renderStatusBadge = (status: PvcStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center justify-center w-[120px] h-[26px] rounded-md text-[11px] font-semibold bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5] shadow-2xs">
            Active
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center justify-center w-[120px] h-[26px] rounded-md text-[11px] font-semibold bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] shadow-2xs">
            Pending
          </span>
        )
      case 'Not Generated':
        return (
          <span className="inline-flex items-center justify-center w-[120px] h-[26px] rounded-md text-[11px] font-semibold bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA] shadow-2xs">
            Not Generated
          </span>
        )
      case 'Signature Pending':
        return (
          <span className="inline-flex items-center justify-center w-[120px] h-[26px] rounded-md text-[11px] font-semibold bg-[#F4EBFF] text-[#6941C6] border border-[#E9D7FE] shadow-2xs">
            Signature Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center justify-center w-[120px] h-[26px] rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto pb-16 space-y-4">
      {/* Top Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-2">
        <Link
          to="/dashboard"
          className="text-[#0066FF] hover:opacity-80 transition-opacity flex items-center"
          title="Home"
        >
          <Home size={14} />
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-500">Workspace</span>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Legal
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">PVC</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            Police Verification Certificate (PVC)
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            View and manage Police Verification Certificate records for all sites.
          </p>
        </div>

        <Link to="/legal/pvc/new">
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} /> New PVC
          </button>
        </Link>
      </div>

      {/* CARD 1: Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        {/* Filter Card Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Use below filters to search and view PVC records.
            </p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="space-y-4">
          {/* Row 1: Site ID, ATM ID, Franchise Name, Mobile Number, Model, PVC Date From */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Site ID */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Site ID
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterSiteId}
                  onChange={(e) => setFilterSiteId(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select site ID</option>
                  {siteOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* ATM ID */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                ATM ID
              </label>
              <div className="relative">
                <Monitor size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterAtmId}
                  onChange={(e) => setFilterAtmId(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select ATM ID</option>
                  {atmOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Franchise Name */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Franchise Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterFranchise}
                  onChange={(e) => setFilterFranchise(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select franchise name</option>
                  {franchiseOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterMobile}
                  onChange={(e) => setFilterMobile(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Model
              </label>
              <div className="relative">
                <Box size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select model</option>
                  {modelOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* PVC Date From */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                PVC Date From
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterPvcFrom}
                  onChange={(e) => setFilterPvcFrom(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* Row 2: PVC Date To, Status, Expiry Date From, Expiry Date To + Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
            {/* PVC Date To */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                PVC Date To
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterPvcTo}
                  onChange={(e) => setFilterPvcTo(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Status
              </label>
              <div className="relative">
                <ListFilter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Not Generated">Not Generated</option>
                  <option value="Signature Pending">Signature Pending</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Expiry Date From */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Expiry Date From
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterExpFrom}
                  onChange={(e) => setFilterExpFrom(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Expiry Date To */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Expiry Date To
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterExpTo}
                  onChange={(e) => setFilterExpTo(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Action Buttons across the remaining 2 columns */}
            <div className="col-span-1 sm:col-span-2 flex items-center justify-end gap-2.5 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={handleSearch}
                className="h-8.5 px-5 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[12.5px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Search size={14} /> Search
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-8.5 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-[12.5px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="h-8.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-[12.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Download size={14} /> Download <ChevronDown size={13} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: PVC Records Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Building2 size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              PVC Records
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-600 font-medium">
              Total Records: {filteredRecords.length}
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

        {/* Responsive Table */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1250px]">
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
                  Model
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  PVC Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Expiry Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  STATUS
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  PVC
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  REMARK
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-center"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500 whitespace-nowrap">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      <Link
                        to={`/legal/pvc/${r.id}`}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        {r.siteId}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-700 font-medium whitespace-nowrap">
                      {r.atmId}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      {r.franchiseName}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                      {r.model}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 font-medium whitespace-nowrap">
                      {r.pvcDate}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 font-medium whitespace-nowrap">
                      {r.expiryDate}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {renderStatusBadge(r.status)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {r.status === 'Not Generated' ? (
                        <Link
                          to="/legal/pvc/new"
                          className="inline-flex items-center justify-center gap-1 w-[88px] h-[26px] rounded-md text-[11px] font-semibold border border-[#B9D5FF] text-[#0066FF] bg-[#EEF4FF] hover:bg-blue-100 transition-colors shadow-2xs mx-auto"
                        >
                          <Plus size={12} strokeWidth={2.4} /> Generate
                        </Link>
                      ) : (
                        <Link
                          to={`/legal/pvc/${r.id}`}
                          className="inline-flex items-center justify-center gap-1.5 w-[88px] h-[26px] rounded-md text-[11px] font-semibold border border-[#B9D5FF] text-[#0066FF] bg-[#EEF4FF] hover:bg-blue-100 transition-colors shadow-2xs mx-auto"
                        >
                          <FileText size={12} /> View
                        </Link>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 text-left whitespace-nowrap max-w-[200px] truncate">
                      {r.remark || '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/legal/pvc/${r.id}/edit`}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/60 transition-colors"
                          title="Edit Record"
                        >
                          <Edit3 size={12} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r.siteId)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <Building2 size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        No PVC records found
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your filters or click on "New PVC" to add an entry.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-500">
          <div>
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              &laquo;
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer ${currentPage === pg
                  ? 'bg-[#0066FF] text-white'
                  : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              &gt;
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              &raquo;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
