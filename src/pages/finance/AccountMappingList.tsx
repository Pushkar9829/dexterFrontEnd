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
  Landmark,
  CreditCard,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  Trash2,
  Edit2,
  ArrowUpDown,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers,
  Paperclip,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'
import {
  useAccountMappings,
  deleteAccountMapping,
  type AccountMappingRecord,
} from '@/data/financeSettlementBank'

export default function AccountMappingList() {
  const navigate = useNavigate()
  const { isReport } = useReportMode()
  const mappings = useAccountMappings()

  // Filter States
  const [filterType, setFilterType] = useState('')
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterHpyCode, setFilterHpyCode] = useState('')
  const [filterFranchiseeName, setFilterFranchiseeName] = useState('')
  const [filterBank, setFilterBank] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [appliedFilters, setAppliedFilters] = useState({
    type: '',
    atmId: '',
    hpyCode: '',
    franchiseeName: '',
    bank: '',
    status: '',
  })

  // Pagination & Sorting
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sortField, setSortField] = useState<keyof AccountMappingRecord>('effectiveDate')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  // Dropdown options
  const atmOptions = useMemo(
    () => Array.from(new Set(mappings.map((m) => m.atmId).filter(Boolean))).sort(),
    [mappings]
  )
  const hpyOptions = useMemo(
    () => Array.from(new Set(mappings.map((m) => m.hpyCode).filter(Boolean))).sort(),
    [mappings]
  )
  const bankOptions = useMemo(
    () => Array.from(new Set(mappings.map((m) => m.bankName).filter(Boolean))).sort(),
    [mappings]
  )

  const handleSearch = () => {
    setAppliedFilters({
      type: filterType,
      atmId: filterAtmId,
      hpyCode: filterHpyCode,
      franchiseeName: filterFranchiseeName,
      bank: filterBank,
      status: filterStatus,
    })
    setCurrentPage(1)
    toast('Account mapping filters applied')
  }

  const handleReset = () => {
    setFilterType('')
    setFilterAtmId('')
    setFilterHpyCode('')
    setFilterFranchiseeName('')
    setFilterBank('')
    setFilterStatus('')
    setAppliedFilters({
      type: '',
      atmId: '',
      hpyCode: '',
      franchiseeName: '',
      bank: '',
      status: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filtered & Sorted Records
  const filtered = useMemo(() => {
    return mappings
      .filter((rec) => {
        if (appliedFilters.type && rec.mappingType !== appliedFilters.type) return false
        if (appliedFilters.atmId && rec.atmId !== appliedFilters.atmId) return false
        if (appliedFilters.hpyCode && rec.hpyCode !== appliedFilters.hpyCode) return false
        if (
          appliedFilters.franchiseeName &&
          !rec.franchiseeName.toLowerCase().includes(appliedFilters.franchiseeName.toLowerCase())
        )
          return false
        if (appliedFilters.bank && rec.bankName !== appliedFilters.bank) return false
        if (appliedFilters.status && rec.status !== appliedFilters.status) return false
        return true
      })
      .sort((a, b) => {
        const valA = a[sortField] || ''
        const valB = b[sortField] || ''
        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
      })
  }, [mappings, appliedFilters, sortField, sortAsc])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedData = filtered.slice(startIndex, endIndex)

  const handleSort = (field: keyof AccountMappingRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Export
  const [showExportMenu, setShowExportMenu] = useState(false)
  const handleExportCsv = () => {
    const headers = [
      'S.N.',
      'ATM ID',
      'Mapping Type',
      'HPY Code',
      'Site ID',
      'Franchisee Name',
      'Contact',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'SOL ID',
      'Status',
      'Effective Date',
    ]
    const rows = filtered.map((r, i) => [
      String(i + 1),
      r.atmId,
      r.mappingType,
      r.hpyCode || '-',
      r.siteId || '-',
      r.franchiseeName,
      r.contact,
      r.bankName,
      r.accountNumber,
      r.ifscCode,
      r.branchSolId || r.solId || '-',
      r.status,
      r.effectiveDate,
    ])
    downloadCsv(`account_mappings_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    setShowExportMenu(false)
    toast('Account mappings exported to CSV')
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete account mapping for "${name}"?`)) {
      deleteAccountMapping(id)
      toast('Account mapping deleted')
    }
  }

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        {isReport ? (
          <>
            <Link to="/reports" className="hover:text-[#0066FF] transition-colors">
              Reports & MIS
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">Settlement Account Mapping Report</span>
          </>
        ) : (
          <>
            <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
              Finance
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/finance/account-management" className="hover:text-[#0066FF] transition-colors">
              Account Management
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/finance/settlement-bank" className="hover:text-[#0066FF] transition-colors">
              Settlement Bank
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">Account Mapping</span>
          </>
        )}
      </div>

      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
            {isReport ? 'Settlement Account Mapping Report' : 'Account Mapping'}
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {isReport
              ? 'View and audit WLA, Axis Indent, and ICICI settlement bank account mappings.'
              : 'View, search, and manage WLA, Axis Indent, and ICICI settlement bank account mappings.'}
          </p>
        </div>
        {!isReport && (
          <button
            onClick={() => navigate('/finance/settlement-bank/account-mapping/new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0066FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors shrink-0"
          >
            <Plus size={16} />
            New Account Mapping
          </button>
        )}
      </div>

      {/* Filter Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Filter size={15} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-800">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and manage account mappings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Mapping Type */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Mapping Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="WLA">WLA</option>
              <option value="Axis Indent">Axis Indent</option>
              <option value="ICICI">ICICI</option>
            </select>
          </div>

          {/* ATM ID */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">ATM ID</label>
            <div className="relative">
              <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterAtmId}
                onChange={(e) => setFilterAtmId(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                <option value="">All ATMs</option>
                {atmOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* HPY Code */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">HPY Code</label>
            <div className="relative">
              <select
                value={filterHpyCode}
                onChange={(e) => setFilterHpyCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none font-mono"
              >
                <option value="">All HPY Codes</option>
                {hpyOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Franchisee Name */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Franchisee Name</label>
            <input
              type="text"
              value={filterFranchiseeName}
              onChange={(e) => setFilterFranchiseeName(e.target.value)}
              placeholder="Search franchisee..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Settlement Bank */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Settlement Bank</label>
            <div className="relative">
              <Landmark size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                <option value="">All Banks</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Mapped">Mapped</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Draft">Draft</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors"
          >
            <Search size={14} />
            Search
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download size={14} />
              Export
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-20">
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <FileText size={14} className="text-blue-500" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet size={14} className="text-emerald-500" />
                  Export Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Layers size={17} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">Account Mapping Records</h3>
              <p className="text-[12px] text-slate-500">
                WLA, Axis Indent, and ICICI nodal sweep mappings and bank details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-slate-600">
            <span>
              Total Records: <strong className="text-slate-900">{totalRecords}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="rounded-md border border-slate-200 py-1 px-2 text-xs text-slate-800 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1360px]">
            <thead className="bg-[#EEF4FC] text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-[#D9E5F5] whitespace-nowrap">
                  S.N.
                </th>
                <th
                  onClick={() => handleSort('atmId')}
                  className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap cursor-pointer hover:bg-blue-100/60 transition-colors min-w-[125px]"
                >
                  <div className="flex items-center gap-1">
                    <span>ATM ID</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-center min-w-[100px]">
                  TYPE
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[120px]">
                  HPY / SITE ID
                </th>
                <th
                  onClick={() => handleSort('franchiseeName')}
                  className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap cursor-pointer hover:bg-blue-100/60 transition-colors min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>FRANCHISEE / VENDOR</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[140px]">
                  BANK NAME
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[140px]">
                  ACCOUNT NO.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[115px]">
                  IFSC
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap min-w-[100px]">
                  SOL ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-center min-w-[100px]">
                  DOCUMENTS
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-center min-w-[130px]">
                  STATUS
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] z-10 w-24">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    No account mapping records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((rec, idx) => {
                  const sNo = startIndex + idx + 1
                  return (
                    <tr key={rec.id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium whitespace-nowrap border-r border-slate-100">
                        {sNo}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <Link
                          to={isReport ? `/finance/settlement-bank/account-mapping/${rec.id}?source=report` : `/finance/settlement-bank/account-mapping/${rec.id}`}
                          className="font-bold text-[#0066FF] hover:underline flex items-center gap-1 font-mono whitespace-nowrap"
                        >
                          {rec.atmId}
                          <ExternalLink size={11} className="opacity-60" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                            rec.mappingType === 'WLA'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : rec.mappingType === 'Axis Indent'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {rec.mappingType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {rec.hpyCode || rec.siteId || '-'}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">{rec.franchiseeName}</div>
                        <div className="text-[10.5px] text-slate-400 whitespace-nowrap">{rec.contact}</div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 whitespace-nowrap">
                        {rec.bankName}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] text-slate-700 font-medium whitespace-nowrap">
                        {rec.accountNumber}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {rec.ifscCode}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {rec.branchSolId || rec.solId || '-'}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] whitespace-nowrap">
                          <Paperclip size={11} className="text-blue-500" />
                          {rec.documents?.length || 0} Docs
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap ${
                            rec.status === 'Mapped'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'Pending Approval' || rec.status === 'Pending Verification'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : rec.status === 'Draft'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {rec.status === 'Mapped' && <CheckCircle2 size={11} />}
                          {(rec.status === 'Pending Approval' || rec.status === 'Pending Verification') && (
                            <Clock size={11} />
                          )}
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-center sticky right-0 bg-white group-hover:bg-[#F3F7FD] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] z-10 w-24 transition-colors">
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {isReport ? (
                            <button
                              onClick={() =>
                                navigate(`/finance/settlement-bank/account-mapping/${rec.id}?source=report`)
                              }
                              title="View Details"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={13} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  navigate(`/finance/settlement-bank/account-mapping/${rec.id}`)
                                }
                                title="Edit / View Form"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(rec.id, rec.franchiseeName)}
                                title="Delete Mapping"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-t border-slate-100 gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalRecords > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalRecords}</span> records
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`h-7 w-7 rounded-md text-xs font-semibold ${
                    currentPage === p
                      ? 'bg-[#0066FF] text-white shadow-sm'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
