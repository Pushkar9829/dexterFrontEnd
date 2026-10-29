import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Home,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Layers,
  ListFilter,
  User,
} from 'lucide-react'
import {
  useChargeBackStore,
  exportChargeBackCsv,
  CHARGEBACK_ATMS,
} from '@/data/chargeBackDisputes'
import { toast } from '@/components/ui/Toast'

export default function ChargeBackDisputeList() {
  const navigate = useNavigate()
  const { records, deleteRecord, resetDummyData } = useChargeBackStore()

  // Filter input states
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [fundingType, setFundingType] = useState('All (SF + FFM)')
  const [selectedAtmId, setSelectedAtmId] = useState('All ATM')
  const [selectedTxnType, setSelectedTxnType] = useState('All TXN Types')
  const [selectedStatus, setSelectedStatus] = useState('All Status')

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    fundingType: 'All (SF + FFM)',
    atmId: 'All ATM',
    txnType: 'All TXN Types',
    status: 'All Status',
  })

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Unique ATM options
  const atmOptions = useMemo(() => {
    const set = new Set<string>()
    records.forEach((r) => set.add(r.atmId))
    CHARGEBACK_ATMS.forEach((a) => set.add(a.atmId))
    return Array.from(set).sort()
  }, [records])

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Funding Type
      if (appliedFilters.fundingType === 'Self Funding (SF)' && r.fundingType !== 'SF') return false
      if (appliedFilters.fundingType === 'Full Funding (FFM)' && r.fundingType !== 'FFM') return false

      // ATM ID
      if (appliedFilters.atmId !== 'All ATM' && r.atmId !== appliedFilters.atmId) return false

      // TXN Type
      if (appliedFilters.txnType !== 'All TXN Types' && r.txnType !== appliedFilters.txnType) return false

      // Status
      if (appliedFilters.status !== 'All Status' && r.status !== appliedFilters.status) return false

      // Dates (simple comparison if provided)
      if (appliedFilters.fromDate && r.txnDate < appliedFilters.fromDate) return false
      if (appliedFilters.toDate && r.txnDate > appliedFilters.toDate) return false

      return true
    })
  }, [records, appliedFilters])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  const handleSearch = () => {
    setAppliedFilters({
      fromDate,
      toDate,
      fundingType,
      atmId: selectedAtmId,
      txnType: selectedTxnType,
      status: selectedStatus,
    })
    setCurrentPage(1)
    toast('Filters applied')
  }

  const handleReset = () => {
    setFromDate('')
    setToDate('')
    setFundingType('All (SF + FFM)')
    setSelectedAtmId('All ATM')
    setSelectedTxnType('All TXN Types')
    setSelectedStatus('All Status')
    setAppliedFilters({
      fromDate: '',
      toDate: '',
      fundingType: 'All (SF + FFM)',
      atmId: 'All ATM',
      txnType: 'All TXN Types',
      status: 'All Status',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  const handleDownload = () => {
    exportChargeBackCsv(filteredRecords, `charge-back-disputes-${Date.now()}`)
    toast(`Exported ${filteredRecords.length} records to CSV`)
  }

  const confirmDelete = () => {
    if (!deletingId) return
    deleteRecord(deletingId)
    setDeletingId(null)
    toast('Record deleted successfully')
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            Resolved
          </span>
        )
      case 'In Progress':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0066FF] border border-blue-200">
            In Progress
          </span>
        )
      case 'Draft':
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
            Draft
          </span>
        )
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
            Pending
          </span>
        )
    }
  }

  const renderFundingBadge = (type: 'FFM' | 'SF') => {
    if (type === 'FFM') {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-bold text-[#0066FF] border border-blue-200/80">
          FFM
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-0.5 text-[11.5px] font-bold text-purple-700 border border-purple-200/80">
        SF
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 pb-12 font-sans space-y-4">
      {/* Breadcrumb: Workspace > Operations > Charge Back Dispute > Charge Back Dispute Data */}
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
        <Link to="/operations/reconciliation" className="hover:text-[#0066FF] transition-colors">
          Charge Back Dispute
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">Charge Back Dispute Data</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-xs">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[26px]">
              Charge Back Dispute Data
            </h1>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              View, search, manage and register charge back disputes for Self Funding (SF) and Full Funding (FFM) sites.
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {records.length === 0 && (
            <button
              type="button"
              onClick={resetDummyData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <RotateCcw size={14} className="text-[#0066FF]" /> Load Sample Data
            </button>
          )}

          <Link
            to="/operations/reconciliation/charge-back/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={16} /> Charge Back Dispute
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        {/* Filter Card Header */}
        <div className="flex items-start gap-2.5 mb-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white">
            <Filter size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#1E293B]">Filter</h3>
            <p className="mt-0.5 text-[12px] text-[#64748B]">
              Use below filters to search and manage charge back dispute records.
            </p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
          {/* From Date */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">From Date</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                <Calendar size={15} />
              </span>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">To Date</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                <Calendar size={15} />
              </span>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>

          {/* Funding Type */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Funding Type</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                <Layers size={15} />
              </span>
              <select
                value={fundingType}
                onChange={(e) => setFundingType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              >
                <option value="All (SF + FFM)">All (SF + FFM)</option>
                <option value="Self Funding (SF)">Self Funding (SF)</option>
                <option value="Full Funding (FFM)">Full Funding (FFM)</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
            </div>
          </div>

          {/* ATM ID */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">ATM ID</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                <User size={15} />
              </span>
              <select
                value={selectedAtmId}
                onChange={(e) => setSelectedAtmId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              >
                <option value="All ATM">All ATM</option>
                {atmOptions.map((atm) => (
                  <option key={atm} value={atm}>
                    {atm}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
            </div>
          </div>

          {/* TXN Type */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">TXN Type</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                <ListFilter size={15} />
              </span>
              <select
                value={selectedTxnType}
                onChange={(e) => setSelectedTxnType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              >
                <option value="All TXN Types">All TXN Types</option>
                <option value="Withdrawal - Card">Withdrawal - Card</option>
                <option value="Withdrawal - UPI">Withdrawal - UPI</option>
                <option value="Deposit - Card">Deposit - Card</option>
                <option value="Deposit - UPI">Deposit - UPI</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Status</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                <FileText size={15} />
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
              >
                <option value="All Status">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Draft">Draft</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <Search size={15} /> Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[13px] font-semibold text-[#64748B] shadow-xs transition-colors hover:bg-slate-50 hover:text-[#1E293B] cursor-pointer"
            title="Reset filters"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[13px] font-semibold text-[#1E293B] shadow-xs transition-colors hover:bg-slate-50 cursor-pointer"
            title="Download CSV records"
          >
            <Download size={15} className="text-[#0066FF]" /> Download <ChevronDown size={13} className="text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
        {/* Table Card Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066FF] text-white">
              <FileText size={15} />
            </div>
            <h3 className="text-[15px] font-bold text-[#1E293B]">Charge Back Dispute Records</h3>
          </div>

          <div className="flex items-center gap-4 text-[13px]">
            <span className="font-medium text-[#334155]">
              Total Records: <strong className="text-[#1E293B]">{filteredRecords.length}</strong>
            </span>

            <div className="relative flex items-center">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="appearance-none rounded-lg border border-[#CBD5E1] bg-white py-1 pl-3 pr-7 text-[12px] font-semibold text-[#334155] focus:border-[#0066FF] focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 text-[#94A3B8]" />
            </div>
          </div>
        </div>

        {/* Scrollable Table matching Image 01 (14 Columns) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11.5px] font-semibold text-[#475569] uppercase tracking-wider whitespace-nowrap">
                <th className="px-3.5 py-3 text-center border-r border-[#E2E8F0] w-12">S.N.</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">Funding Type</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">ATM ID</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">Ticket Number</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">TXN Type</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">TXN ID</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">UTR</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">TXN Date</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">TXN Time</th>
                <th className="px-3.5 py-3 border-r border-[#E2E8F0]">RRN</th>
                <th className="px-3.5 py-3 text-right border-r border-[#E2E8F0]">Amount (₹)</th>
                <th className="px-3.5 py-3 text-right border-r border-[#E2E8F0]">Dispute Amt (₹)</th>
                <th className="px-3.5 py-3 text-center border-r border-[#E2E8F0]">Status</th>
                <th className="px-3.5 py-3 text-center sticky right-0 bg-[#F8FAFC] shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0066FF] mb-3">
                        <FileText size={28} />
                      </div>
                      <h4 className="text-[15px] font-bold text-[#1E293B]">No records found</h4>
                      <p className="mt-1 text-[12.5px] text-[#64748B]">
                        Try adjusting your search or filter criteria.
                      </p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="mt-3 text-[12px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 transition-colors hover:bg-blue-50/30 whitespace-nowrap"
                  >
                    {/* 1. S.N. */}
                    <td className="px-3.5 py-3 text-center font-medium text-slate-500 border-r border-slate-100">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* 2. Funding Type */}
                    <td className="px-3.5 py-3 text-center border-r border-slate-100">
                      {renderFundingBadge(r.fundingType)}
                    </td>

                    {/* 3. ATM ID */}
                    <td className="px-3.5 py-3 font-semibold text-[#0066FF] border-r border-slate-100">
                      {r.atmId}
                    </td>

                    {/* 4. Ticket Number (opens filled form page directly) */}
                    <td className="px-3.5 py-3 border-r border-slate-100">
                      <button
                        type="button"
                        onClick={() => navigate(`/operations/reconciliation/charge-back/${r.id}`)}
                        className="font-semibold text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Open Filled Dispute Form"
                      >
                        {r.ticketNumber}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>

                    {/* 5. TXN Type */}
                    <td className="px-3.5 py-3 border-r border-slate-100">
                      <span className="inline-flex rounded-md bg-blue-50/70 px-2 py-0.5 text-[11px] font-medium text-[#0066FF] border border-blue-200/50">
                        {r.txnType}
                      </span>
                    </td>

                    {/* 6. TXN ID */}
                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-[#334155] border-r border-slate-100">
                      {r.txnId}
                    </td>

                    {/* 7. UTR */}
                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-500 border-r border-slate-100">
                      {r.utr || '-'}
                    </td>

                    {/* 8. TXN Date */}
                    <td className="px-3.5 py-3 text-[#334155] border-r border-slate-100">
                      {r.txnDate}
                    </td>

                    {/* 9. TXN Time */}
                    <td className="px-3.5 py-3 text-[#334155] border-r border-slate-100">
                      {r.txnTime}
                    </td>

                    {/* 10. RRN */}
                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-600 border-r border-slate-100">
                      {r.rrnNumber || '-'}
                    </td>

                    {/* 11. Amount (₹) */}
                    <td className="px-3.5 py-3 text-right font-bold text-[#1E293B] border-r border-slate-100">
                      ₹ {Number(r.txnAmt || 0).toLocaleString('en-IN')}
                    </td>

                    {/* 12. Dispute Amt (₹) */}
                    <td className="px-3.5 py-3 text-right font-bold text-red-600 border-r border-slate-100">
                      ₹ {Number(r.disputeAmt || 0).toLocaleString('en-IN')}
                    </td>

                    {/* 13. Status */}
                    <td className="px-3.5 py-3 text-center border-r border-slate-100">
                      {renderStatusBadge(r.status)}
                    </td>

                    {/* 14. Action (NO POPUP - Opens filled form page directly) */}
                    <td className="px-3 py-2.5 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/operations/reconciliation/charge-back/${r.id}`)}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/80 transition-colors cursor-pointer"
                          title="View / Open Filled Form"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/operations/reconciliation/charge-back/${r.id}`)}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/80 transition-colors cursor-pointer"
                          title="Edit Dispute Form"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingId(r.id)}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete Dispute"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#E2E8F0] px-5 py-3 text-[12.5px] text-[#64748B]">
          <div>
            Showing{' '}
            <strong className="text-[#1E293B]">
              {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-[#1E293B]">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </strong>{' '}
            of <strong className="text-[#1E293B]">{filteredRecords.length}</strong> records
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#CBD5E1] text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="First page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#CBD5E1] text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#0066FF] text-white'
                    : 'border border-[#CBD5E1] text-[#334155] hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#CBD5E1] text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#CBD5E1] text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Last page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#1E293B]">Delete Charge Back Dispute?</h3>
                <p className="mt-0.5 text-[12.5px] text-[#64748B]">
                  Are you sure you want to delete this dispute record? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-[13px] font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 cursor-pointer shadow-xs"
              >
                Delete Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

