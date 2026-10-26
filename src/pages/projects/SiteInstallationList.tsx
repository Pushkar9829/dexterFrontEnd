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
  Phone,
  MapPin,
  List,
  Layers,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  FileCheck,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import {
  useSiteInstallations,
  exportSiteInstallationCsv,
  deleteSiteInstallationRecord,
  populateSampleRecords,
  clearAllRecords,
} from '@/data/siteInstallation'
import { toast } from '@/components/ui/Toast'

export default function SiteInstallationList() {
  const navigate = useNavigate()
  const { records } = useSiteInstallations()

  // Filter States
  const [filterSiteLoi, setFilterSiteLoi] = useState('')
  const [filterFranchise, setFilterFranchise] = useState('')
  const [filterContact, setFilterContact] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterSdStatus, setFilterSdStatus] = useState('')
  const [filterElectrical, setFilterElectrical] = useState('')
  const [filterTisStatus, setFilterTisStatus] = useState('')
  const [filterAtmStatus, setFilterAtmStatus] = useState('')
  const [filterVsat, setFilterVsat] = useState('')
  const [filterUps, setFilterUps] = useState('')
  const [filterAgreement, setFilterAgreement] = useState('')

  // Applied Filter states (triggered on clicking "Search")
  const [appliedFilters, setAppliedFilters] = useState({
    siteLoi: '',
    franchise: '',
    contact: '',
    location: '',
    model: '',
    sdStatus: '',
    electrical: '',
    tisStatus: '',
    atmStatus: '',
    vsat: '',
    ups: '',
    agreement: '',
  })

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const handleSearch = () => {
    setAppliedFilters({
      siteLoi: filterSiteLoi,
      franchise: filterFranchise,
      contact: filterContact,
      location: filterLocation,
      model: filterModel,
      sdStatus: filterSdStatus,
      electrical: filterElectrical,
      tisStatus: filterTisStatus,
      atmStatus: filterAtmStatus,
      vsat: filterVsat,
      ups: filterUps,
      agreement: filterAgreement,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFilterSiteLoi('')
    setFilterFranchise('')
    setFilterContact('')
    setFilterLocation('')
    setFilterModel('')
    setFilterSdStatus('')
    setFilterElectrical('')
    setFilterTisStatus('')
    setFilterAtmStatus('')
    setFilterVsat('')
    setFilterUps('')
    setFilterAgreement('')
    setAppliedFilters({
      siteLoi: '',
      franchise: '',
      contact: '',
      location: '',
      model: '',
      sdStatus: '',
      electrical: '',
      tisStatus: '',
      atmStatus: '',
      vsat: '',
      ups: '',
      agreement: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (appliedFilters.siteLoi && !r.siteLoi.toLowerCase().includes(appliedFilters.siteLoi.toLowerCase())) return false
      if (appliedFilters.franchise && !r.franchisee.toLowerCase().includes(appliedFilters.franchise.toLowerCase())) return false
      if (appliedFilters.contact && !r.frContact.includes(appliedFilters.contact)) return false
      if (appliedFilters.location && !r.siteLocation.toLowerCase().includes(appliedFilters.location.toLowerCase())) return false
      if (appliedFilters.model && r.model !== appliedFilters.model) return false
      if (appliedFilters.sdStatus && r.sdStatus !== appliedFilters.sdStatus) return false
      if (appliedFilters.electrical && r.electrical !== appliedFilters.electrical) return false
      if (appliedFilters.tisStatus && r.tisStatus !== appliedFilters.tisStatus) return false
      if (appliedFilters.atmStatus && !r.atmMachine.toLowerCase().includes(appliedFilters.atmStatus.toLowerCase())) return false
      if (appliedFilters.vsat && !r.vsat.toLowerCase().includes(appliedFilters.vsat.toLowerCase())) return false
      if (appliedFilters.ups && !r.ups.toLowerCase().includes(appliedFilters.ups.toLowerCase())) return false
      if (appliedFilters.agreement && r.agreementStatus !== appliedFilters.agreement) return false
      return true
    })
  }, [records, appliedFilters])

  // Pagination calculation
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast('No records to export')
      return
    }
    exportSiteInstallationCsv(filteredRecords, 'site-installation-data')
    toast(`${filteredRecords.length} record(s) exported successfully`)
  }

  const handleDelete = (id: string, siteLoi: string) => {
    if (confirm(`Are you sure you want to delete site installation for ${siteLoi}?`)) {
      deleteSiteInstallationRecord(id)
      toast(`Record ${siteLoi} deleted`)
    }
  }

  // Format status badge
  const renderStatusBadge = (val: string) => {
    if (!val) return <span className="text-slate-400">—</span>
    const v = val.toLowerCase()
    if (v.includes('done') || v.includes('complete') || v.includes('verified') || v.includes('registered') || v.includes('active') || v.includes('live') || v.includes('received')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          {val}
        </span>
      )
    }
    if (v.includes('pending') || v.includes('preparation') || v.includes('applied') || v.includes('mail sent')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
          {val}
        </span>
      )
    }
    if (v.includes('progress') || v.includes('delivered')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
          {val}
        </span>
      )
    }
    return <span className="text-[12px] text-slate-700">{val}</span>
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Breadcrumb matching Image 1: Workspace > Projects > Site Installation */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/projects" className="hover:text-[#0066FF] transition-colors">
          Projects
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Site Installation</span>
      </div>

      {/* Page Title & Top Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            Site Installation
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            View and manage site installation status and related activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {records.length === 0 ? (
            <button
              onClick={populateSampleRecords}
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0066FF] transition-all shadow-sm"
              title="Quickly fill sample records to test table"
            >
              Demo Records
            </button>
          ) : (
            <button
              onClick={clearAllRecords}
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600 transition-all shadow-sm"
              title="Reset to empty state like reference image"
            >
              Clear Records
            </button>
          )}

          <button
            onClick={() => navigate('/projects/installation/new')}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Site Installation</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        {/* Filter Card Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and view site installation records.
            </p>
          </div>
        </div>

        {/* 12 Filter Inputs Grid (2 rows x 6 cols on large screens) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Site/LOI Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Site/LOI Number
            </label>
            <div className="relative">
              <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterSiteLoi}
                onChange={(e) => setFilterSiteLoi(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select site/LOI number</option>
                <option value="SIT-2025-001">SIT-2025-001</option>
                <option value="SIT-2025-002">SIT-2025-002</option>
                <option value="SIT-2025-003">SIT-2025-003</option>
                <option value="ST-MH-PUN-00124">ST-MH-PUN-00124</option>
                <option value="ST-KA-BLR-00125">ST-KA-BLR-00125</option>
                <option value="ST-TN-CHN-00126">ST-TN-CHN-00126</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Franchise Name */}
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
                <option value="Om Sai Enterprises">Om Sai Enterprises</option>
                <option value="Balaji Financial Services">Balaji Financial Services</option>
                <option value="Shree Ganesh Associates">Shree Ganesh Associates</option>
                <option value="Apex Logistics & Fin">Apex Logistics & Fin</option>
                <option value="Star FinTech Solutions">Star FinTech Solutions</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 3. FR Contact Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              FR Contact Number
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <input
                type="text"
                value={filterContact}
                onChange={(e) => setFilterContact(e.target.value)}
                placeholder="Enter contact number"
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* 4. Site Location */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Site Location
            </label>
            <div className="relative">
              <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select location</option>
                <option value="Pune">Pune, Maharashtra</option>
                <option value="Bangalore">Bangalore, Karnataka</option>
                <option value="Delhi">Connaught Place, New Delhi</option>
                <option value="Chennai">Chennai, Tamil Nadu</option>
                <option value="Mumbai">Mumbai, Maharashtra</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 5. Model */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Model
            </label>
            <div className="relative">
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select model</option>
                <option value="Garnet Model">Garnet Model</option>
                <option value="Sapphire Model">Sapphire Model</option>
                <option value="Diamond Model">Diamond Model</option>
                <option value="Platinum Model">Platinum Model</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 6. SD Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              SD Status
            </label>
            <div className="relative">
              <select
                value={filterSdStatus}
                onChange={(e) => setFilterSdStatus(e.target.value)}
                className="w-full h-8.5 px-3 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select SD status</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 7. Electrical Work */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Electrical Work
            </label>
            <div className="relative">
              <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterElectrical}
                onChange={(e) => setFilterElectrical(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Complete">Complete</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 8. TIS Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              TIS Status
            </label>
            <div className="relative">
              <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterTisStatus}
                onChange={(e) => setFilterTisStatus(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Complete">Complete</option>
                <option value="Pending">Pending</option>
                <option value="Under Verification">Under Verification</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 9. Installation Status (ATM) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Installation Status (ATM)
            </label>
            <div className="relative">
              <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterAtmStatus}
                onChange={(e) => setFilterAtmStatus(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Installation Pending">Installation Pending</option>
                <option value="Installation Done">Installation Done</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 10. V-SAT */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              V-SAT
            </label>
            <div className="relative">
              <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterVsat}
                onChange={(e) => setFilterVsat(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Installation Pending">Installation Pending</option>
                <option value="Installation Done">Installation Done</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 11. UPS */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              UPS
            </label>
            <div className="relative">
              <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterUps}
                onChange={(e) => setFilterUps(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Installation Pending">Installation Pending</option>
                <option value="Installation Done">Installation Done</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 12. Agreement Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Agreement Status
            </label>
            <div className="relative">
              <List size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none" />
              <select
                value={filterAgreement}
                onChange={(e) => setFilterAgreement(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none"
              >
                <option value="">Select status</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
                <option value="Sent for Signing">Sent for Signing</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
            <span>Download</span>
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Records Card ("Site Installation Records") */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Layers size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Site Installation Records
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
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Site/LOI Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Name of Franchisee
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  FR Contact Number
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  FR Email
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Site Location
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Model
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  SD Status
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] w-24">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-center"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/projects/installation/${item.id}`)}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        {item.siteLoi}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      {item.franchisee || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.frContact || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-left text-slate-600">
                      {item.frEmail || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-left">
                      {item.siteLocation || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-medium">
                      {item.model || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {renderStatusBadge(item.sdStatus)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/projects/installation/${item.id}`)}
                          className="p-1 text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 rounded"
                          title="Edit / Open"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.siteLoi)}
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
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      {/* Document with checklist icon container */}
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">
                        No records found
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your filters or click on "New Site Installation" to add a record.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => navigate('/projects/installation/new')}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold transition-all shadow-xs"
                        >
                          <Plus size={13} />
                          New Site Installation
                        </button>
                        <button
                          onClick={populateSampleRecords}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-all"
                        >
                          Load Sample Data
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Horizontal Scroll indicator and Footer / Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 bg-white gap-3">
          <div className="text-[12px] text-slate-500">
            {totalRecords === 0
              ? 'Showing 0 to 0 of 0 records'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords} records`}
          </div>

          {/* Pagination Buttons matching Image 1: << < 1 > >> */}
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

            {/* Current Page button (blue active square) */}
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
