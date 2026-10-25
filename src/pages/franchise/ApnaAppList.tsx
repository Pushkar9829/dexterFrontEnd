import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileSpreadsheet,
  Filter,
  Home,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  deleteApnaAppRegistration,
  useApnaAppRegistrations,
} from '@/data/apnaAppStore'

export default function ApnaAppList() {
  const navigate = useNavigate()
  const records = useApnaAppRegistrations()

  // Filter States
  const [siteFilter, setSiteFilter] = useState('')
  const [atmFilter, setAtmFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [franchiseFilter, setFranchiseFilter] = useState('')
  const [masterFranchiseFilter, setMasterFranchiseFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Applied Filter States
  const [appliedFilters, setAppliedFilters] = useState({
    site: '',
    atm: '',
    location: '',
    franchise: '',
    masterFranchise: '',
    from: '',
    to: '',
  })

  // Pagination & Display
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // Unique options for dropdowns
  const siteOptions = useMemo(() => Array.from(new Set(records.map((r) => r.siteLoiNumber).filter(Boolean))), [records])
  const atmOptions = useMemo(() => Array.from(new Set(records.map((r) => r.atmId).filter(Boolean))), [records])
  const locationOptions = useMemo(() => Array.from(new Set(records.map((r) => r.location).filter(Boolean))), [records])
  const franchiseOptions = useMemo(() => Array.from(new Set(records.map((r) => r.franchiseName).filter(Boolean))), [records])
  const masterFranchiseOptions = useMemo(() => Array.from(new Set(records.map((r) => r.masterFranchise).filter(Boolean))), [records])

  // Apply filters on Search click
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setAppliedFilters({
      site: siteFilter,
      atm: atmFilter,
      location: locationFilter,
      franchise: franchiseFilter,
      masterFranchise: masterFranchiseFilter,
      from: fromDate,
      to: toDate,
    })
    setCurrentPage(1)
  }

  // Reset filters
  const handleReset = () => {
    setSiteFilter('')
    setAtmFilter('')
    setLocationFilter('')
    setFranchiseFilter('')
    setMasterFranchiseFilter('')
    setFromDate('')
    setToDate('')
    setAppliedFilters({
      site: '',
      atm: '',
      location: '',
      franchise: '',
      masterFranchise: '',
      from: '',
      to: '',
    })
    setCurrentPage(1)
  }

  // Filter Logic
  const filtered = useMemo(() => {
    return records.filter((rec) => {
      if (appliedFilters.site && rec.siteLoiNumber !== appliedFilters.site) return false
      if (appliedFilters.atm && rec.atmId !== appliedFilters.atm) return false
      if (appliedFilters.location && rec.location !== appliedFilters.location) return false
      if (appliedFilters.franchise && rec.franchiseName !== appliedFilters.franchise) return false
      if (appliedFilters.masterFranchise && rec.masterFranchise !== appliedFilters.masterFranchise) return false
      if (appliedFilters.from) {
        const fromTs = new Date(appliedFilters.from).getTime()
        const recTs = new Date(rec.createdAt).getTime()
        if (recTs < fromTs) return false
      }
      if (appliedFilters.to) {
        const toTs = new Date(appliedFilters.to).getTime() + 86400000
        const recTs = new Date(rec.createdAt).getTime()
        if (recTs > toTs) return false
      }
      return true
    })
  }, [records, appliedFilters])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Export CSV
  const handleExport = () => {
    const headers = [
      'S.N.',
      'Site/LOI Number',
      'ATM ID',
      'Location',
      'Name of Franchise',
      'Franchise Contact Number',
      'Franchise Email ID',
      'Master Franchise',
      'Master Franchise Contact',
      'Master Franchise Email',
      'User ID',
    ]

    const rows = filtered.map((r) => [
      r.sn,
      r.siteLoiNumber,
      r.atmId,
      r.location,
      r.franchiseName,
      r.franchiseContact,
      r.franchiseEmail,
      r.masterFranchise,
      r.masterContact,
      r.masterEmail,
      r.userId,
    ])

    downloadCsv(`Apna_App_Registration_Data_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filtered.length} records to CSV`)
  }

  const handleDelete = (id: string, sn: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete registration entry S.N. ${sn}? This cannot be undone.`)) {
      deleteApnaAppRegistration(id)
      toast(`Deleted entry S.N. ${sn}`, 'info')
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] pb-16 font-sans">
      {/* Breadcrumb */}
      <nav className="mb-2.5 flex items-center gap-1.5 text-[12px] text-[#64748B]">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-[#0066FF]">
          <Home size={13} className="text-[#64748B]" />
          <span>Workspace</span>
        </Link>
        <span>&gt;</span>
        <Link to="/projects" className="hover:text-[#0066FF]">
          Projects
        </Link>
        <span>&gt;</span>
        <span className="font-medium text-[#1E293B]">Apna App Registration</span>
      </nav>

      {/* Page Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#0F172A]">
            Apna App Registration Data
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            View and manage Apna App user registration details for site, franchise and master franchise.
          </p>
        </div>

        {/* Primary Action Button */}
        <Button
          type="button"
          size="md"
          onClick={() => navigate('/franchise/apna-app/new')}
          className="bg-[#0066FF] px-4 font-semibold text-white shadow-sm hover:bg-[#0052cc]"
        >
          <Plus size={16} className="mr-1.5" strokeWidth={2.5} /> New Registration
        </Button>
      </div>

      {/* ── 1. Filter Card ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-[#DCE8F6] bg-white p-5 shadow-xs">
        {/* Filter Title Bar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF] text-white">
            <Filter size={15} />
          </div>
          <h2 className="text-[15px] font-bold text-[#1E293B]">Filter</h2>
        </div>

        {/* Filter Inputs Form */}
        <form onSubmit={handleSearch}>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Site / LOI Number */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                Site/LOI Number
              </label>
              <div className="relative">
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 pr-8 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="">Select site/LOI number</option>
                  {siteOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-[#94A3B8]" />
              </div>
            </div>

            {/* ATM ID */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                ATM ID
              </label>
              <div className="relative">
                <select
                  value={atmFilter}
                  onChange={(e) => setAtmFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 pr-8 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="">Select ATM ID</option>
                  {atmOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-[#94A3B8]" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                Location
              </label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 pr-8 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="">Select location</option>
                  {locationOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-[#94A3B8]" />
              </div>
            </div>

            {/* Franchise Name */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                Franchise Name
              </label>
              <div className="relative">
                <select
                  value={franchiseFilter}
                  onChange={(e) => setFranchiseFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 pr-8 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="">Select franchise</option>
                  {franchiseOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-[#94A3B8]" />
              </div>
            </div>

            {/* Master Franchise */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                Master Franchise
              </label>
              <div className="relative">
                <select
                  value={masterFranchiseFilter}
                  onChange={(e) => setMasterFranchiseFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 pr-8 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                >
                  <option value="">Select master franchise</option>
                  {masterFranchiseOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-[#94A3B8]" />
              </div>
            </div>

            {/* From Date */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#475569]">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                size="md"
                className="h-9 flex-1 bg-[#0066FF] font-semibold text-white shadow-xs hover:bg-[#0052cc]"
              >
                <Search size={14} className="mr-1.5" /> Search
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleReset}
                className="h-9 border-[#CBD5E1] bg-white px-3 text-[#334155] hover:bg-[#F8FAFC]"
                title="Reset Filters"
              >
                <RotateCcw size={14} className="mr-1 text-[#64748B]" /> Reset
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleExport}
                className="h-9 border-[#CBD5E1] bg-white px-3 text-[#334155] hover:bg-[#F8FAFC]"
                title="Export Data"
              >
                <Download size={14} className="mr-1 text-[#64748B]" /> Export <ChevronDown size={13} className="ml-1 text-[#94A3B8]" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── 2. Table Card ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[#DCE8F6] bg-white shadow-xs">
        {/* Table Title Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#E2EEFB] bg-white px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF] text-white">
              <Building2 size={15} />
            </div>
            <h3 className="text-[15px] font-bold text-[#1E293B]">
              Apna App Registration Data Status
            </h3>
          </div>

          <div className="flex items-center gap-3 text-[12px] text-[#64748B]">
            <span>
              Total Records: <strong className="text-[#1E293B]">{totalRecords}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-7 rounded-md border border-[#CBD5E1] bg-white px-2 text-[12px] text-[#334155] outline-none focus:border-[#0066FF]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#DCE8F6] bg-[#EAF2FD]/70 text-[11px] font-bold uppercase tracking-wider text-[#334155]">
                <th className="py-3 px-3 text-center w-14">S.N.</th>
                <th className="py-3 px-4 whitespace-nowrap">Site/LOI Number</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Name of Franchise</th>
                <th className="py-3 px-4 whitespace-nowrap">Contact Number</th>
                <th className="py-3 px-4 whitespace-nowrap">Email Id</th>
                <th className="py-3 px-4 text-center w-24 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/franchise/apna-app/${item.id}`)}
                    className="cursor-pointer transition-colors duration-150 hover:bg-[#F8FAFD]"
                  >
                    <td className="py-3.5 px-3 text-center font-medium text-[#64748B]">
                      {item.sn}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#1E293B] whitespace-nowrap">
                      {item.siteLoiNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">
                      {item.location || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#1E293B]">
                      {item.franchiseName || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#475569] whitespace-nowrap">
                      {item.franchiseContact || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                      {item.franchiseEmail || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/franchise/apna-app/${item.id}`)}
                          className="grid h-7 w-7 place-items-center rounded-md text-[#0066FF] hover:bg-[#EAF2FD]"
                          title="Edit Registration"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, item.sn, e)}
                          className="grid h-7 w-7 place-items-center rounded-md text-[#EF4444] hover:bg-red-50"
                          title="Delete Registration"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty State matching Page 01 screenshot */
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-[#EAF2FD] text-[#0066FF]">
                        <FileSpreadsheet size={28} className="opacity-80" />
                      </div>
                      <h4 className="text-[15px] font-bold text-[#1E293B]">No records found</h4>
                      <p className="mt-1 text-[12.5px] text-[#64748B]">
                        Try adjusting your filters or click on "New Registration" to add a record.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate('/franchise/apna-app/new')}
                        className="mt-4 bg-[#0066FF] text-white"
                      >
                        <Plus size={14} className="mr-1" /> New Registration
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 3. Footer Pagination Bar ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between border-t border-[#E2EEFB] bg-white px-5 py-3 text-[12px] text-[#64748B]">
          <div>
            Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="grid h-7 w-7 place-items-center rounded border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="grid h-7 w-7 place-items-center rounded border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`grid h-7 min-w-[28px] place-items-center rounded px-1.5 font-medium transition-colors ${currentPage === pg
                  ? 'bg-[#0066FF] text-white'
                  : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]'
                  }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="grid h-7 w-7 place-items-center rounded border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="grid h-7 w-7 place-items-center rounded border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
