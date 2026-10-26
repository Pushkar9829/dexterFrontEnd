import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Plus,
  Filter,
  Building2,
  Monitor,
  User,
  ListFilter,
  Landmark,
  Calendar,
  Search,
  RotateCcw,
  Download,
  ChevronDown,
  Edit3,
  Trash2,
  FileText,
} from 'lucide-react'
import {
  useChequeRecords,
  deleteChequeRecord,
  type ChequeAcknowledgementStatus,
  type ChequeCollectionType,
} from '@/data/legalCheques'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'

export default function FmChecksList() {
  const navigate = useNavigate()
  const { records } = useChequeRecords()

  // Filter States
  const [filterSiteId, setFilterSiteId] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterFranchise, setFilterFranchise] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterBankName, setFilterBankName] = useState('')
  const [filterFrPodFrom, setFilterFrPodFrom] = useState('')
  const [filterFrPodTo, setFilterFrPodTo] = useState('')
  const [filterHitachiCheque, setFilterHitachiCheque] = useState('')
  const [filterDexterCheque, setFilterDexterCheque] = useState('')
  const [filterBankPodFrom, setFilterBankPodFrom] = useState('')
  const [filterBankPodTo, setFilterBankPodTo] = useState('')
  const [filterAcknowledgement, setFilterAcknowledgement] = useState<string>('')

  // Applied Filter States
  const [appliedFilters, setAppliedFilters] = useState({
    siteId: '',
    atmId: '',
    franchise: '',
    type: '',
    bankName: '',
    frPodFrom: '',
    frPodTo: '',
    hitachiCheque: '',
    dexterCheque: '',
    bankPodFrom: '',
    bankPodTo: '',
    acknowledgement: '',
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
    () => Array.from(new Set(records.map((r) => r.franchiseeName))).filter(Boolean),
    [records]
  )
  const bankOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.frBankName))).filter(Boolean),
    [records]
  )

  const handleSearch = () => {
    setAppliedFilters({
      siteId: filterSiteId,
      atmId: filterAtmId,
      franchise: filterFranchise,
      type: filterType,
      bankName: filterBankName,
      frPodFrom: filterFrPodFrom,
      frPodTo: filterFrPodTo,
      hitachiCheque: filterHitachiCheque,
      dexterCheque: filterDexterCheque,
      bankPodFrom: filterBankPodFrom,
      bankPodTo: filterBankPodTo,
      acknowledgement: filterAcknowledgement,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFilterSiteId('')
    setFilterAtmId('')
    setFilterFranchise('')
    setFilterType('')
    setFilterBankName('')
    setFilterFrPodFrom('')
    setFilterFrPodTo('')
    setFilterHitachiCheque('')
    setFilterDexterCheque('')
    setFilterBankPodFrom('')
    setFilterBankPodTo('')
    setFilterAcknowledgement('')
    setAppliedFilters({
      siteId: '',
      atmId: '',
      franchise: '',
      type: '',
      bankName: '',
      frPodFrom: '',
      frPodTo: '',
      hitachiCheque: '',
      dexterCheque: '',
      bankPodFrom: '',
      bankPodTo: '',
      acknowledgement: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  const handleExport = () => {
    downloadCsv(
      'cheques-data-records',
      [
        'S.N.',
        'Site ID',
        'ATM ID',
        'FR Name',
        'Mobile Number',
        'Model',
        'Type',
        'FR Bank Name',
        'FR POD',
        'FR POD Date',
        'Hitachi - Cheque Number',
        'Dexter - Cheque Number',
        'POD to Bank',
        'Bank POD Date',
        'Acknowledgement',
        'REMARK',
      ],
      filteredRecords.map((r) => [
        String(r.sn),
        r.siteId,
        r.atmId,
        r.franchiseeName,
        r.mobileNumber,
        r.model,
        r.type,
        r.frBankName,
        r.frPod,
        r.frPodDate,
        r.hitachiChequeNumber,
        r.dexterChequeNumber,
        r.podToBank,
        r.bankPodDate,
        r.acknowledgement,
        r.remark,
      ])
    )
    toast('Cheques records exported successfully')
  }

  const handleDelete = (id: string, siteId: string) => {
    if (confirm(`Are you sure you want to delete cheque record for ${siteId}?`)) {
      deleteChequeRecord(id)
      toast('Cheque record deleted')
    }
  }

  // Filtered List
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (appliedFilters.siteId && r.siteId !== appliedFilters.siteId) return false
      if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
      if (appliedFilters.franchise && r.franchiseeName !== appliedFilters.franchise) return false
      if (appliedFilters.type && r.type !== appliedFilters.type) return false
      if (appliedFilters.bankName && r.frBankName !== appliedFilters.bankName) return false
      if (appliedFilters.frPodFrom && r.frPodDate < appliedFilters.frPodFrom) return false
      if (appliedFilters.frPodTo && r.frPodDate > appliedFilters.frPodTo) return false
      if (appliedFilters.hitachiCheque && !r.hitachiChequeNumber.toLowerCase().includes(appliedFilters.hitachiCheque.toLowerCase())) return false
      if (appliedFilters.dexterCheque && !r.dexterChequeNumber.toLowerCase().includes(appliedFilters.dexterCheque.toLowerCase())) return false
      if (appliedFilters.bankPodFrom && r.bankPodDate < appliedFilters.bankPodFrom) return false
      if (appliedFilters.bankPodTo && r.bankPodDate > appliedFilters.bankPodTo) return false
      if (appliedFilters.acknowledgement && r.acknowledgement !== appliedFilters.acknowledgement) return false
      return true
    })
  }, [records, appliedFilters])

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  const renderAcknowledgementBadge = (status: ChequeAcknowledgementStatus) => {
    switch (status) {
      case 'Acknowledged':
        return (
          <span className="inline-flex items-center justify-center w-[110px] h-[26px] rounded-md text-[11px] font-semibold bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5] shadow-2xs">
            Acknowledged
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center justify-center w-[110px] h-[26px] rounded-md text-[11px] font-semibold bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] shadow-2xs">
            Pending
          </span>
        )
      case 'Received':
        return (
          <span className="inline-flex items-center justify-center w-[110px] h-[26px] rounded-md text-[11px] font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] shadow-2xs">
            Received
          </span>
        )
      case 'Rejected':
        return (
          <span className="inline-flex items-center justify-center w-[110px] h-[26px] rounded-md text-[11px] font-semibold bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA] shadow-2xs">
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center justify-center w-[110px] h-[26px] rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            {status}
          </span>
        )
    }
  }

  const renderTypeBadge = (type: ChequeCollectionType) => {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-[#0066FF] border border-blue-200/60">
        {type}
      </span>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-16 space-y-4">
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
        <span className="font-semibold text-slate-800">Cheques</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">

        <Link to="/legal/fm-checks/new">
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} /> New Cheque
          </button>
        </Link>
      </div>

      {/* CARD 1: Filter Card matching Page 01 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        {/* Filter Card Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Use below filters to search and view cheque records.
            </p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="space-y-4">
          {/* Row 1: Site ID, ATM ID, Franchisee Name, Type, FR Bank Name, FR POD Date From */}
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

            {/* Franchisee Name */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Franchisee Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterFranchise}
                  onChange={(e) => setFilterFranchise(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select franchisee name</option>
                  {franchiseOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Type
              </label>
              <div className="relative">
                <ListFilter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select type</option>
                  <option value="Employee">Employee</option>
                  <option value="SMF">SMF</option>
                  <option value="MF">MF</option>
                  <option value="FR">FR</option>
                  <option value="Party Vendor">Party Vendor</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* FR Bank Name */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                FR Bank Name
              </label>
              <div className="relative">
                <Landmark size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterBankName}
                  onChange={(e) => setFilterBankName(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select bank name</option>
                  {bankOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* FR POD Date From */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                FR POD Date From
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterFrPodFrom}
                  onChange={(e) => setFilterFrPodFrom(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* Row 2: FR POD Date To, Hitachi Cheque Number, Dexter Cheque Number, Bank POD Date From, Bank POD Date To, Acknowledgement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* FR POD Date To */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                FR POD Date To
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterFrPodTo}
                  onChange={(e) => setFilterFrPodTo(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Hitachi Cheque Number */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Hitachi Cheque Number
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterHitachiCheque}
                  onChange={(e) => setFilterHitachiCheque(e.target.value)}
                  placeholder="Enter cheque number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
                />
              </div>
            </div>

            {/* Dexter Cheque Number */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Dexter Cheque Number
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterDexterCheque}
                  onChange={(e) => setFilterDexterCheque(e.target.value)}
                  placeholder="Enter cheque number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
                />
              </div>
            </div>

            {/* Bank POD Date From */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Bank POD Date From
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterBankPodFrom}
                  onChange={(e) => setFilterBankPodFrom(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Bank POD Date To */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Bank POD Date To
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterBankPodTo}
                  onChange={(e) => setFilterBankPodTo(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Acknowledgement */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Acknowledgement
              </label>
              <div className="relative">
                <ListFilter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <select
                  value={filterAcknowledgement}
                  onChange={(e) => setFilterAcknowledgement(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select status</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
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

      {/* CARD 2: Cheques Records Table Card matching Page 01 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Building2 size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Cheques Records
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

        {/* Table View */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1550px]">
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
                  FR Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Mobile Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Model
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Type
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  FR Bank Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  FR POD
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  FR POD Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Hitachi - Cheque Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Dexter - Cheque Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  POD to Bank
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Bank POD Date
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Acknowledgement
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
                        to={`/legal/fm-checks/${r.id}`}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        {r.siteId}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-700 font-medium whitespace-nowrap">
                      {r.atmId}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      {r.franchiseeName}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                      {r.mobileNumber}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                      {r.model}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {renderTypeBadge(r.type)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-700 text-left whitespace-nowrap">
                      {r.frBankName}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[10.5px] text-slate-700 whitespace-nowrap">
                      {r.frPod}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 font-medium whitespace-nowrap">
                      {r.frPodDate}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                      {r.hitachiChequeNumber}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                      {r.dexterChequeNumber}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[10.5px] text-slate-700 whitespace-nowrap">
                      {r.podToBank}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 font-medium whitespace-nowrap">
                      {r.bankPodDate}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {renderAcknowledgementBadge(r.acknowledgement)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 text-left whitespace-nowrap max-w-[200px] truncate">
                      {r.remark || '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/legal/fm-checks/${r.id}/edit`)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/60 transition-colors cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit3 size={12} />
                        </button>
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
                /* Empty State matching Page 01 */
                <tr>
                  <td colSpan={17} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileText size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>
                      <h3 className="text-[15px] font-bold text-slate-900">
                        No records found
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your filters or click on "New Cheque" to add a record.
                      </p>
                      <div className="mt-4">
                        <Link to="/legal/fm-checks/new">
                          <button
                            type="button"
                            className="h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[12px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <Plus size={14} /> New Cheque
                          </button>
                        </Link>
                      </div>
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
