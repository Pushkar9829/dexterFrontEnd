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
  Hash,
  CreditCard,
  FileText,
  Landmark,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  ListFilter,
  Edit2,
  Trash2,
  ExternalLink,
  FileCheck,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import {
  PAYOUT_STATUSES,
  deletePayout,
  maskAcc,
  payoutStore,
} from '@/data/financePayout'

export default function PayoutList() {
  const navigate = useNavigate()
  const records = payoutStore.use()

  // Filter States
  const [filterAtmId, setFilterAtmId] = useState('')
  const [filterLoiCode, setFilterLoiCode] = useState('')
  const [filterPanName, setFilterPanName] = useState('')
  const [filterPanNo, setFilterPanNo] = useState('')
  const [filterBankName, setFilterBankName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAccNo, setFilterAccNo] = useState('')
  const [filterIfsc, setFilterIfsc] = useState('')

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    atmId: '',
    loiCode: '',
    panName: '',
    panNo: '',
    bankName: '',
    status: '',
    accNo: '',
    ifsc: '',
  })

  // Pagination
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Options for Dropdowns
  const atmOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.atmId).filter(Boolean))).sort(),
    [records]
  )
  const loiOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.loiCode).filter(Boolean))).sort(),
    [records]
  )
  const bankOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.bankName).filter(Boolean))).sort(),
    [records]
  )

  const handleSearch = () => {
    setAppliedFilters({
      atmId: filterAtmId,
      loiCode: filterLoiCode,
      panName: filterPanName,
      panNo: filterPanNo,
      bankName: filterBankName,
      status: filterStatus,
      accNo: filterAccNo,
      ifsc: filterIfsc,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFilterAtmId('')
    setFilterLoiCode('')
    setFilterPanName('')
    setFilterPanNo('')
    setFilterBankName('')
    setFilterStatus('')
    setFilterAccNo('')
    setFilterIfsc('')
    setAppliedFilters({
      atmId: '',
      loiCode: '',
      panName: '',
      panNo: '',
      bankName: '',
      status: '',
      accNo: '',
      ifsc: '',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  // Filtered List
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (appliedFilters.atmId && r.atmId !== appliedFilters.atmId) return false
      if (appliedFilters.loiCode && r.loiCode !== appliedFilters.loiCode) return false
      if (
        appliedFilters.panName &&
        !r.panName.toLowerCase().includes(appliedFilters.panName.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.panNo &&
        !r.panNo.toLowerCase().includes(appliedFilters.panNo.toLowerCase())
      ) {
        return false
      }
      if (appliedFilters.bankName && r.bankName !== appliedFilters.bankName) return false
      if (appliedFilters.status && r.status !== appliedFilters.status) return false
      if (appliedFilters.accNo && !r.accNo.includes(appliedFilters.accNo)) return false
      if (
        appliedFilters.ifsc &&
        !r.ifsc.toLowerCase().includes(appliedFilters.ifsc.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [records, appliedFilters])

  // Pagination calculation
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Export CSV
  const handleExport = () => {
    const headers = [
      'S.N.',
      'Payout ID',
      'ATM ID',
      'LOI Code',
      'PAN Name',
      'PAN No.',
      'Acc. Name (Settlement)',
      'Acc. No. (Settlement)',
      'Bank Name',
      'IFSC',
      'Email Subject',
      'Status',
    ]

    const rows = filtered.map((r, i) => [
      String(i + 1),
      r.id,
      r.atmId,
      r.loiCode,
      r.panName,
      r.panNo,
      r.accName,
      r.accNo,
      r.bankName,
      r.ifsc,
      r.emailSubject,
      r.status,
    ])

    downloadCsv(`Payout_Data_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filtered.length} payout records to CSV`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete payout account for ${name}?`)) {
      deletePayout(id)
      toast('Record deleted')
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Breadcrumb: Workspace > Finance > Payout Data */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
          Finance
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Payout Data</span>
      </div>

      {/* Page Title & Top Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            Payout
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage settlement accounts, PAN verification, bank routing, and disbursement records.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/finance/payout/new')}
            className="inline-flex items-center gap-2 h-9.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Payout Record</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Filter</h2>
            <p className="text-[12px] text-slate-500">
              Use below filters to search and view payout records.
            </p>
          </div>
        </div>

        {/* Row 1 Filters: ATM ID, LOI Code, PAN Name, PAN Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {/* ATM ID */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
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
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select ATM ID</option>
                {atmOptions.map((atm) => (
                  <option key={atm} value={atm}>
                    {atm}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* LOI Code */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              LOI Code
            </label>
            <div className="relative">
              <FileText
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterLoiCode}
                onChange={(e) => setFilterLoiCode(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">Select LOI Code</option>
                {loiOptions.map((loi) => (
                  <option key={loi} value={loi}>
                    {loi}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* PAN Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              PAN Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterPanName}
                onChange={(e) => setFilterPanName(e.target.value)}
                placeholder="Enter PAN Name"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* PAN Number */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              PAN Number
            </label>
            <div className="relative">
              <Hash
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterPanNo}
                onChange={(e) => setFilterPanNo(e.target.value)}
                placeholder="Enter 10-char PAN"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Row 2 Filters: Settlement Bank, Status, Account Number, IFSC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Settlement Bank */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Settlement Bank
            </label>
            <div className="relative">
              <Landmark
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterBankName}
                onChange={(e) => setFilterBankName(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
              >
                <option value="">All Banks</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Status
            </label>
            <div className="relative">
              <ListFilter
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-8.5 pl-8 pr-7 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
              >
                <option value="">All Statuses</option>
                {PAYOUT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Account Number
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterAccNo}
                onChange={(e) => setFilterAccNo(e.target.value)}
                placeholder="Enter account no."
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              IFSC Code
            </label>
            <div className="relative">
              <Hash
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
              />
              <input
                type="text"
                value={filterIfsc}
                onChange={(e) => setFilterIfsc(e.target.value)}
                placeholder="Enter IFSC"
                className="w-full h-8.5 pl-8 pr-3 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all placeholder:text-slate-400 font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-xs"
          >
            <Search size={13} />
            <span>Search</span>
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all"
          >
            <RotateCcw size={13} />
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

      {/* Records Card ("Payout Records") */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Landmark size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Payout Records
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
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12">
                  S.N.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  ATM ID
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  LOI Code
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  PAN Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  PAN No.
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Acc. Name (Settlement)
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap font-mono">
                  Acc. No. (Settlement)
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Bank Name
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap font-mono">
                  IFSC
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">
                  Email Subject
                </th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)] w-24">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginated.length > 0 ? (
                paginated.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors text-center"
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-500">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-semibold text-[#0066FF] whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/finance/payout/${item.id}`)}
                        className="hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        {item.atmId || '—'}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-[10.5px] text-slate-700">
                      {item.loiCode || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800 text-left whitespace-nowrap">
                      {item.panName || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-[10.5px] text-slate-700">
                      {item.panNo || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-left whitespace-nowrap text-slate-700 font-medium">
                      {item.accName || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-[11px] text-slate-800">
                      {maskAcc(item.accNo) || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-700">
                      {item.bankName || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap font-mono text-[10.5px] text-slate-700 uppercase">
                      {item.ifsc || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-left text-slate-600 max-w-[220px] truncate">
                      {item.emailSubject || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${item.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : item.status === 'Pending verification'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                      >
                        {item.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/finance/payout/${item.id}`)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/60 transition-colors"
                          title="Edit / Open"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.panName || item.atmId)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty State */
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-16 rounded-xl bg-[#EAF2FC] border border-[#CDE1F8] flex flex-col items-center justify-center shadow-xs mb-3 text-[#0066FF]">
                        <FileCheck size={30} strokeWidth={1.8} className="text-[#0066FF]" />
                      </div>

                      <h3 className="text-[15px] font-bold text-slate-900">
                        No records found
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 max-w-[320px]">
                        Try adjusting your filters or click on "New Payout Record" to add an entry.
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => navigate('/finance/payout/new')}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[11px] font-semibold transition-all shadow-xs"
                        >
                          <Plus size={13} />
                          New Payout Record
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-white text-[12px] text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, totalRecords)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{totalRecords}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                return (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                )
              })
              .map((page, index, array) => {
                const prev = array[index - 1]
                const showEllipsis = prev && page - prev > 1

                return (
                  <div key={page} className="flex items-center">
                    {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded text-[11px] font-semibold flex items-center justify-center transition-all ${currentPage === page
                          ? 'bg-[#0066FF] text-white shadow-xs'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
