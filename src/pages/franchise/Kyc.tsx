import { useState, useMemo, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  Building2,
  Download,
  Search,
  Filter,
  RotateCcw,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  ExternalLink,
  Eye,
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Sparkles,
  Loader2,
  Layers,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { downloadCsv } from '@/lib/export'
import {
  KYC_DOCS,
  decide,
  getKycCase,
  updateCase,
  useKycCases,
  type KycCase,
  type KycCaseStatus,
} from '@/data/kyc'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

// ══════════════════════════════════════════════════════════════════════════
// 1. KYC QUEUE (LIST PAGE: /kyc/verification)
// ══════════════════════════════════════════════════════════════════════════

type QueueStatusFilter = KycCaseStatus | 'all'

interface StatusTileConfig {
  key: QueueStatusFilter
  label: string
  icon: ReactNode
  activeBg: string
  activeBorder: string
  activeBadge: string
  inactiveBg: string
  inactiveBorder: string
}

const STATUS_TILES: StatusTileConfig[] = [
  {
    key: 'all',
    label: 'All Cases',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center shrink-0">
        <Layers size={17} className="text-[#2563EB]" />
      </div>
    ),
    activeBg: 'bg-[#F8FAFF]',
    activeBorder: 'border-2 border-[#60A5FA] shadow-xs',
    activeBadge: 'bg-[#DBEAFE] text-[#1D4ED8]',
    inactiveBg: 'bg-[#F8FAFF]',
    inactiveBorder: 'border border-[#BFDBFE]/70 hover:border-[#93C5FD]',
  },
  {
    key: 'Under Verification',
    label: 'Awaiting Audit',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#FFEDD5] flex items-center justify-center shrink-0">
        <div className="w-5.5 h-5.5 rounded-full bg-[#F97316] flex items-center justify-center text-white shadow-2xs">
          <Clock size={12} strokeWidth={2.8} className="text-white" />
        </div>
      </div>
    ),
    activeBg: 'bg-[#FFF7ED]',
    activeBorder: 'border-2 border-orange-500 shadow-xs',
    activeBadge: 'bg-[#FFEDD5] text-[#C2410C]',
    inactiveBg: 'bg-[#FFF7ED]',
    inactiveBorder: 'border border-[#FFEDD5] hover:border-[#FED7AA]',
  },
  {
    key: 'Approved',
    label: 'Approved',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center gap-1 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
      </div>
    ),
    activeBg: 'bg-[#F0FDF4]',
    activeBorder: 'border-2 border-emerald-500 shadow-xs',
    activeBadge: 'bg-[#DCFCE7] text-[#15803D]',
    inactiveBg: 'bg-[#F0FDF4]',
    inactiveBorder: 'border border-[#DCFCE7] hover:border-[#BBF7D0]',
  },
  {
    key: 'Resubmission requested',
    label: 'Resubmission Req.',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center shrink-0">
        <XCircle size={17} className="text-[#DC2626]" />
      </div>
    ),
    activeBg: 'bg-[#FEF2F2]',
    activeBorder: 'border-2 border-red-500 shadow-xs',
    activeBadge: 'bg-[#FEE2E2] text-[#B91C1C]',
    inactiveBg: 'bg-[#FEF2F2]',
    inactiveBorder: 'border border-[#FEE2E2] hover:border-[#FECDD3]',
  },
]

export function KycQueue() {
  const cases = useKycCases()
  const navigate = useNavigate()

  // Filter States
  const [tab, setTab] = useState<QueueStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')

  // Applied Filter states
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'all',
    region: 'all',
  })

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Unique regions
  const regions = useMemo(() => {
    return Array.from(new Set(cases.map((c) => c.region.split(',')[1]?.trim() || c.region))).filter(Boolean)
  }, [cases])

  const handleSearch = () => {
    setAppliedFilters({
      search,
      status: statusFilter,
      region: regionFilter,
    })
    setCurrentPage(1)
    toast('Filters applied to verification queue')
  }

  const handleReset = () => {
    setSearch('')
    setStatusFilter('all')
    setRegionFilter('all')
    setAppliedFilters({
      search: '',
      status: 'all',
      region: 'all',
    })
    setTab('all')
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filter logic
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      // Tab filter
      if (tab !== 'all' && c.status !== tab) return false

      // Status dropdown filter
      if (appliedFilters.status !== 'all' && c.status !== appliedFilters.status) return false

      // Region filter
      if (appliedFilters.region !== 'all' && !c.region.includes(appliedFilters.region)) return false

      // Search Query
      if (appliedFilters.search.trim()) {
        const q = appliedFilters.search.toLowerCase()
        const match =
          c.id.toLowerCase().includes(q) ||
          c.applicant.toLowerCase().includes(q) ||
          c.franchiseId.toLowerCase().includes(q) ||
          c.loi.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [cases, tab, appliedFilters])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Export to CSV
  const handleExport = () => {
    if (filtered.length === 0) {
      toast('No cases to export')
      return
    }

    const headers = ['Case ID', 'Franchise ID', 'Applicant', 'Site / LOI', 'Region', 'Status', 'PAN', 'Submitted At']
    const rows = filtered.map((c) => [
      c.id,
      c.franchiseId,
      c.applicant,
      c.loi,
      c.region,
      c.status,
      c.fields.pan,
      c.submittedAt,
    ])

    downloadCsv(`kyc-verification-queue-${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`${filtered.length} case(s) exported successfully`)
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      {/* Breadcrumb matching EmployeeList pattern: Workspace > Onboarding > KYC Management > Verification */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">
          Onboarding
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/kyc" className="hover:text-[#0066FF] transition-colors">
          KYC Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Verification</span>
      </div>

      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            KYC Verification
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Compare uploaded identity documents with extracted details, perform automated verification, and approve cases.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Download size={14} className="text-[#0066FF]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Status Tiles Row matching EmployeeList */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_TILES.map((t) => {
          const count =
            t.key === 'all'
              ? cases.length
              : cases.filter((c) => c.status === t.key).length

          const isActive = tab === t.key

          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setTab(t.key)
                setCurrentPage(1)
              }}
              className={`flex items-center justify-between gap-2.5 h-[52px] px-3.5 rounded-xl transition-all duration-150 cursor-pointer text-left ${isActive
                ? `${t.activeBorder} ${t.activeBg}`
                : `${t.inactiveBorder} ${t.inactiveBg}`
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.icon}
                <span className="text-[13px] font-bold text-[#1E1B4B] whitespace-nowrap">
                  {t.label}
                </span>
              </div>

              <span
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg text-[13px] font-bold shrink-0 transition-colors ${isActive
                  ? t.activeBadge
                  : 'bg-white shadow-2xs border border-slate-200/40 text-[#1E1B4B]'
                  }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Section matching EmployeeList pattern */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and manage applicant verification cases.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* 1. Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Search Cases
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Case ID, Applicant, Franchise ID..."
                className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          {/* 2. Region Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Region / State
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Case Status
            </label>
            <div className="relative">
              <Layers
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="Under Verification">Under Verification</option>
                <option value="Approved">Approved</option>
                <option value="Resubmission requested">Resubmission requested</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-4 pt-1">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Table Records Card matching EmployeeList */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Layers size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Cases
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
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
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
                  Case ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Applicant Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Franchise ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Site / LOI
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Region
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Documents Verified
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Latest Upload
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
                        onClick={() => navigate(`/kyc/verification/${item.id}`)}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        {item.id}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.applicant
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.applicant}</div>
                          <div className="text-[10px] text-slate-400">PAN: {item.fields.pan}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-medium text-slate-700">
                      {item.franchiseId}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700">
                      {item.loi}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-left text-slate-700">
                      {item.region}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {item.docs.filter((d) => d.checked).length} of {item.docs.length} verified
                      </span>
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      {item.status === 'Approved' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          Approved
                        </span>
                      ) : item.status === 'Resubmission requested' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200/60">
                          Resubmission req.
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#0066FF] border border-blue-200/60">
                          Under Verification
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-500 text-[10px]">
                      {fmt(item.submittedAt)}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/30 shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <button
                        onClick={() => navigate(`/kyc/verification/${item.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0066FF] bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>{item.status === 'Under Verification' ? 'Audit' : 'View'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty state matching EmployeeList */
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <ShieldCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">No cases found</h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your search criteria or filters to locate applicant cases.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={handleReset}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-all cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching EmployeeList */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-slate-200 bg-white gap-3">
          <div className="text-[12px] text-slate-500">
            {totalRecords === 0
              ? 'Showing 0 to 0 of 0 records'
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                currentPage * pageSize,
                totalRecords
              )} of ${totalRecords} records`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            <button className="w-7 h-7 rounded bg-[#0066FF] text-white text-[12px] font-semibold flex items-center justify-center shadow-xs">
              {currentPage}
            </button>

            {totalPages > 1 && currentPage < totalPages && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded border border-slate-200 text-slate-700 text-[12px] font-medium flex items-center justify-center hover:bg-slate-50 cursor-pointer"
              >
                {currentPage + 1}
              </button>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || totalRecords === 0}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
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

// ══════════════════════════════════════════════════════════════════════════
// 2. DOCUMENT INSPECTOR & WORKSPACE (/kyc/verification/:caseId)
// ══════════════════════════════════════════════════════════════════════════

function RealisticDocCanvas({ c, doc, zoom }: { c: KycCase; doc: string; zoom: number }) {
  return (
    <div className="grid h-full min-h-[520px] place-items-center overflow-auto bg-slate-100/80 p-6 rounded-b-xl border border-t-0 border-slate-200">
      <div
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
        className="transition-transform duration-150 ease-out"
      >
        {doc === 'PAN Card' ? (
          /* PAN Card Physical Simulation */
          <div className="w-[520px] rounded-xl border border-[#D5C28F] bg-gradient-to-br from-[#FAF3DE] via-[#F5ECCB] to-[#EFE2B9] p-6 shadow-md text-slate-800 relative overflow-hidden">
            <div className="flex justify-between items-start text-[10px] font-bold text-slate-700 tracking-tight">
              <div>
                <span className="block text-[11px] text-slate-900 font-extrabold">आयकर विभाग</span>
                <span>INCOME TAX DEPARTMENT</span>
              </div>
              <div className="w-10 h-10 rounded-full border border-amber-900/30 flex items-center justify-center text-[8px] font-bold text-amber-900 bg-amber-200/40">
                GOVT
              </div>
              <div className="text-right">
                <span className="block text-[11px] text-slate-900 font-extrabold">भारत सरकार</span>
                <span>GOVT. OF INDIA</span>
              </div>
            </div>

            <div className="mt-6 flex gap-4 items-center">
              <div className="w-[100px] h-[120px] rounded border border-amber-400/60 bg-slate-300 flex items-center justify-center text-[26px] font-bold text-slate-600 shadow-inner">
                {c.fields.nameOnPan
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>

              <div className="text-[12px] space-y-2 flex-1">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-500">Name</div>
                  <div className="text-[15px] font-bold uppercase text-slate-900">
                    {c.fields.nameOnPan}
                  </div>
                </div>

                {c.fields.fatherName && (
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-500">Father's Name</div>
                    <div className="font-semibold text-slate-800 uppercase text-[12px]">
                      {c.fields.fatherName}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-500">Date of Birth</div>
                  <div className="font-semibold text-slate-800 text-[12px]">
                    {c.fields.dob.split('-').reverse().join(' / ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-amber-300/60 flex items-center justify-between">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500">Permanent Account Number</div>
                <div className="text-[20px] font-extrabold font-mono tracking-widest text-slate-900">
                  {c.fields.pan}
                </div>
              </div>
              <div className="h-6 w-28 border-b-2 border-slate-700 font-cursive text-[13px] text-slate-600 flex items-end">
                {c.fields.nameOnPan.split(' ')[0]}
              </div>
            </div>
          </div>
        ) : doc === 'Aadhaar' ? (
          /* Aadhaar Card Physical Simulation */
          <div className="w-[480px] rounded-xl border border-slate-300 bg-white p-6 shadow-md text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b-2 border-red-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700 text-xs">
                  UID
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900">भारत विशिष्ट पहचान प्राधिकरण</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Unique Identification Authority of India</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-4">
              <div className="w-[90px] h-[110px] rounded border border-slate-200 bg-slate-200 flex items-center justify-center text-[22px] font-bold text-slate-500">
                {c.fields.nameOnPan
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="space-y-1 text-[12px]">
                <div className="font-bold text-[14px] text-slate-900">{c.fields.nameOnPan}</div>
                <div className="text-slate-600">DOB: {c.fields.dob.split('-').reverse().join('/')}</div>
                <div className="text-slate-600">Gender: Male / Trans</div>
                <div className="text-slate-500 text-[11px] mt-1">{c.fields.address}</div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 text-center">
              <div className="text-[18px] font-mono font-bold tracking-widest text-slate-900">
                XXXX XXXX {c.fields.aadhaarLast4}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">मेरा आधार, मेरी पहचान</div>
            </div>
          </div>
        ) : (
          /* Rent Agreement Simulation */
          <div className="w-[480px] rounded-lg border border-slate-200 bg-white p-6 shadow-md text-slate-800 font-serif">
            <div className="text-center pb-3 border-b border-slate-200">
              <div className="text-[16px] font-bold tracking-tight text-slate-900 uppercase">
                Registered Lease &amp; Rent Agreement
              </div>
              <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                Stamp Certificate No. IN-MH{Math.floor(10000000 + Math.random() * 90000000)}
              </div>
            </div>

            <div className="mt-4 text-[12px] space-y-2 leading-relaxed text-slate-700">
              <p>
                This deed of rent agreement is executed on this day between the Lessor and Lessee for
                commercial premises located at:
              </p>
              <p className="font-semibold text-slate-900 bg-slate-50 p-2 rounded border border-slate-100 font-sans text-[11px]">
                {c.fields.address}
              </p>
              <p>
                Lessee: <span className="font-semibold text-slate-900">{c.fields.nameOnPan}</span> ({c.applicant})
              </p>
              <p>
                LOI Reference: <span className="font-mono text-slate-900">{c.loi}</span>
              </p>
              <div className="pt-4 flex justify-between text-[11px] font-sans">
                <div>Landlord Signature: _____________</div>
                <div>Tenant Signature: _____________</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function KycWorkspace() {
  const { caseId = '' } = useParams()
  useKycCases()
  const c = getKycCase(caseId)
  const navigate = useNavigate()

  const [doc, setDoc] = useState<string>('PAN Card')
  const [zoom, setZoom] = useState(100)
  const [verifying, setVerifying] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [openedAt] = useState(() => new Date().toISOString())

  if (!c) return <Navigate to="/kyc/verification" replace />

  const locked = c.status !== 'Under Verification'
  const current = c.docs.find((d) => d.type === doc) || c.docs[0]
  const latest = current?.versions[0] || { v: 1, file: 'document.pdf', at: openedAt, by: c.applicant }

  const setField = (k: keyof KycCase['fields'], v: string) =>
    updateCase(c.id, { fields: { ...c.fields, [k]: v } })

  const setCheck = (k: keyof KycCase['checklist']) =>
    updateCase(c.id, { checklist: { ...c.checklist, [k]: !c.checklist[k] } })

  const allChecked = Object.values(c.checklist).every(Boolean)

  const verifyApi = () => {
    setVerifying(true)
    setTimeout(() => {
      updateCase(c.id, {
        api: { at: new Date().toISOString(), nameMatch: 98 },
        checklist: { ...c.checklist, panActive: true, aadhaarConsent: true },
        docs: c.docs.map((d) => (d.type === 'Rent Agreement' ? d : { ...d, checked: true })),
      })
      setVerifying(false)
      toast('PAN & Aadhaar verified via live API', 'success')
    }, 900)
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1500px]">
      {/* Breadcrumb matching EmployeeList pattern: Workspace > Onboarding > KYC Management > Verification > Case ID */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">
          Onboarding
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/kyc" className="hover:text-[#0066FF] transition-colors">
          KYC Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/kyc/verification" className="hover:text-[#0066FF] transition-colors">
          Verification
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{c.id}</span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              {c.applicant}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.status === 'Approved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : c.status === 'Resubmission requested'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-blue-50 text-[#0066FF] border-blue-200'
                }`}
            >
              {c.status}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Case ID: <span className="font-semibold text-slate-800">{c.id}</span></span>
            <span>·</span>
            <span>Franchise: <Link to={`/franchise/master-data/${c.franchiseId}`} className="font-semibold text-[#0066FF] hover:underline">{c.franchiseId}</Link></span>
            <span>·</span>
            <span>LOI: <span className="font-mono text-slate-700">{c.loi}</span></span>
            <span>·</span>
            <span>{c.region}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/kyc/verification')}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} className="text-slate-400" />
            <span>Back to Queue</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Column Audit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Document Viewer (7 Cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Document Header & Tabs */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                  Uploaded Identity Proofs
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Latest submission {fmt(c.submittedAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => toast(`Downloading ${latest.file}`, 'info')}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition-all shadow-2xs cursor-pointer"
              >
                <Download size={13} className="text-[#0066FF]" />
                <span>Download</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {KYC_DOCS.map((t) => {
                const d = c.docs.find((x) => x.type === t)
                const isSelected = doc === t

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDoc(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${isSelected
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                      }`}
                  >
                    <FileText size={13} />
                    <span>{t}</span>
                    {d?.checked && (
                      <CheckCircle2
                        size={13}
                        className={isSelected ? 'text-white' : 'text-emerald-600'}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white text-[11px] font-mono">
            <span className="truncate max-w-[240px] text-slate-300">{latest.file}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Zoom Out"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="p-1 hover:text-[#0066FF] cursor-pointer"
              >
                <Minus size={13} />
              </button>
              <span className="min-w-[40px] text-center">{zoom}%</span>
              <button
                type="button"
                aria-label="Zoom In"
                onClick={() => setZoom((z) => Math.min(160, z + 10))}
                className="p-1 hover:text-[#0066FF] cursor-pointer"
              >
                <Plus size={13} />
              </button>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Page 1 / 1</span>
            </div>
          </div>

          {/* Document Canvas with Watermark */}
          <div className="relative">
            <RealisticDocCanvas c={c} doc={doc} zoom={zoom} />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"
            >
              <span className="-rotate-[24deg] font-mono text-[13px] whitespace-nowrap text-slate-900/10 select-none">
                Compliance Officer | Dexter CRM | {fmt(openedAt)}
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: Verification & Audit Controls (5 Cols) */}
        <section className="lg:col-span-5 space-y-4">
          {/* Automated API Verification Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                  Automated API Audit
                </h2>
                <p className="text-[12px] text-slate-500">
                  Real-time ITD &amp; UIDAI identity match
                </p>
              </div>

              {c.api ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check size={12} strokeWidth={3} /> API Matched
                </span>
              ) : (
                <button
                  type="button"
                  onClick={verifyApi}
                  disabled={verifying || locked}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {verifying ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{verifying ? 'Verifying...' : 'Verify API'}</span>
                </button>
              )}
            </div>

            {c.api && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-[12px]">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 size={15} /> Real-time identity confirmed
                </div>
                <div className="mt-1 text-emerald-700 text-[11px] leading-relaxed">
                  PAN active &amp; valid · Name match: <strong>{c.api.nameMatch}%</strong> · Aadhaar consent validated · Audited at {fmt(c.api.at)}
                </div>
              </div>
            )}
          </div>

          {/* Extracted Details Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                  Extracted Form Data
                </h3>
                <p className="text-[11px] text-slate-400">
                  Review and cross-verify with source documents
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  disabled={locked}
                  value={c.fields.pan}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                  className="w-full h-8 px-2.5 text-[12px] font-mono font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Entity Type
                </label>
                <input
                  type="text"
                  disabled={locked}
                  value={c.fields.entityType}
                  onChange={(e) => setField('entityType', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Name on PAN Card
              </label>
              <input
                type="text"
                disabled={locked}
                value={c.fields.nameOnPan}
                onChange={(e) => setField('nameOnPan', e.target.value)}
                className="w-full h-8 px-2.5 text-[12px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  disabled={locked}
                  value={c.fields.dob}
                  onChange={(e) => setField('dob', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Aadhaar (Last 4)
                </label>
                <input
                  type="text"
                  disabled={locked}
                  value={c.fields.aadhaarLast4}
                  onChange={(e) => setField('aadhaarLast4', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] font-mono rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Registered Address
              </label>
              <input
                type="text"
                disabled={locked}
                value={c.fields.address}
                onChange={(e) => setField('address', e.target.value)}
                className="w-full h-8 px-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Compliance Officer Notes
              </label>
              <textarea
                rows={2}
                disabled={locked}
                value={c.note}
                onChange={(e) => updateCase(c.id, { note: e.target.value })}
                placeholder="Auditor notes on document quality or remarks..."
                className="w-full p-2 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-[13px] font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#0066FF]" />
              <span>Verification Checklist</span>
            </h3>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3 border border-slate-200">
              {(
                [
                  ['panActive', 'PAN is active and verified in ITD registry'],
                  ['aadhaarConsent', 'Aadhaar consent verified &amp; UID matched'],
                  ['addressLegible', 'Premises address proof is legible'],
                  ['rentValid', 'Rent / Lease agreement legally valid'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2.5 cursor-pointer text-[12px] text-slate-700">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={c.checklist[k]}
                    onChange={() => setCheck(k)}
                    className="w-4 h-4 rounded text-[#0066FF] focus:ring-[#0066FF] border-slate-300"
                  />
                  <span dangerouslySetInnerHTML={{ __html: label }} />
                </label>
              ))}
            </div>
          </div>

          {/* Decision Outcome or Action Buttons */}
          {c.decision && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">
                Decision: {c.status}
              </div>
              <div>Audited by {c.decision.by} at {fmt(c.decision.at)}</div>
              {c.decision.reason && (
                <div className="text-red-700 bg-red-50 p-2 rounded border border-red-100 mt-2 font-medium">
                  "{c.decision.reason}"
                </div>
              )}
            </div>
          )}

          {!locked && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  className="flex-1 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[12px] font-semibold transition-all cursor-pointer"
                >
                  Reject &amp; Request Resubmission
                </button>

                <button
                  type="button"
                  disabled={!allChecked}
                  onClick={() => {
                    decide(c.id, true)
                    toast(`${c.applicant} KYC approved successfully!`, 'success')
                    navigate('/kyc/verification')
                  }}
                  className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Approve KYC
                </button>
              </div>

              {!allChecked && (
                <p className="text-[11px] text-slate-400 text-center">
                  All 4 checklist requirements must be ticked before approval.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Reject Modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-[16px] font-bold text-slate-900">
                Reject &amp; Request Resubmission
              </h3>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-[12px] text-slate-500 mb-2">
                Specify the deficiency or reason shown to <strong>{c.applicant}</strong>:
              </p>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Uploaded PAN scan is blurred. Please upload a clear color copy showing full borders."
                className="w-full p-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-4 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim()}
                onClick={() => {
                  decide(c.id, false, reason.trim())
                  toast('Resubmission requested · applicant notified', 'info')
                  navigate('/kyc/verification')
                }}
                className="px-4 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                Send Resubmission Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
