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
  User,
  ListFilter,
} from 'lucide-react'
import {
  useDisputeStore,
  exportDisputesToCsv,
  ATM_LIST,
} from '@/data/failedTxnDisputes'
import { toast } from '@/components/ui/Toast'

export default function FailedTxnsDisputeList() {
  const navigate = useNavigate()
  const { records, deleteRecord, resetDummyData } = useDisputeStore()

  // Filter states
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedAtmId, setSelectedAtmId] = useState('All ATM')
  const [selectedTxnType, setSelectedTxnType] = useState('All TXN Types')
  const [selectedStatus, setSelectedStatus] = useState('All Status')

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    atmId: 'All ATM',
    txnType: 'All TXN Types',
    status: 'All Status',
  })

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (appliedFilters.atmId !== 'All ATM' && r.atmId !== appliedFilters.atmId) return false
      if (appliedFilters.txnType !== 'All TXN Types' && r.txnType !== appliedFilters.txnType) return false
      if (appliedFilters.status !== 'All Status' && r.status !== appliedFilters.status) return false
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
    setSelectedAtmId('All ATM')
    setSelectedTxnType('All TXN Types')
    setSelectedStatus('All Status')
    setAppliedFilters({
      fromDate: '',
      toDate: '',
      atmId: 'All ATM',
      txnType: 'All TXN Types',
      status: 'All Status',
    })
    setCurrentPage(1)
    toast('Filters reset')
  }

  const handleDownload = () => {
    if (filteredRecords.length === 0) {
      toast('No dispute records to download')
      return
    }
    exportDisputesToCsv(filteredRecords, `failed-txn-disputes-${Date.now()}`)
    toast('Dispute records exported successfully')
  }

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteRecord(deletingId)
      toast('Dispute record deleted successfully', 'success')
      setDeletingId(null)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return (
          <span className="inline-flex items-center rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            Resolved
          </span>
        )
      case 'In Progress':
        return (
          <span className="inline-flex items-center rounded-md border border-blue-200/60 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#0066FF]">
            In Progress
          </span>
        )
      case 'Pending':
        return (
          <span className="inline-flex items-center rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 pb-12 font-sans space-y-4">
      {/* Breadcrumb matching Page 01: Workspace > Operations > Dispute / Failed TXN > Dispute Failed TXNs Data */}
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
          Dispute / Failed TXN
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">Dispute Failed TXNs Data</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-xs">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[26px]">
              Dispute Failed TXNs Data
            </h1>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              View and manage all failed / disputed transactions with complete details.
            </p>
          </div>
        </div>

        {/* Top Right Action: + New Dispute TXN */}
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
            to="/operations/reconciliation/failed-txns/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={16} /> New Dispute TXN
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
              Use below filters to search and manage disputed / failed transaction records.
            </p>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
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
                {ATM_LIST.map((atm) => (
                  <option key={atm.atmId} value={atm.atmId}>
                    {atm.atmId}
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
                <option value="Deposit - UPI">Deposit - UPI</option>
                <option value="Deposit - Card">Deposit - Card</option>
                <option value="Withdrawal - UPI">Withdrawal - UPI</option>
                <option value="Withdrawal - Card">Withdrawal - Card</option>
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

          {/* Action Buttons */}
          <div className="flex items-end gap-2 pt-1 sm:pt-0">
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
              title="Download records"
            >
              <Download size={15} className="text-[#0066FF]" /> Download <ChevronDown size={13} className="text-[#94A3B8]" />
            </button>
          </div>
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
            <h3 className="text-[15px] font-bold text-[#1E293B]">Dispute Failed TXNs Data</h3>
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
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2 text-[#64748B]" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto scroll-thin">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#EEF4FC] text-[11.5px] font-bold tracking-tight text-[#334155] uppercase whitespace-nowrap">
                <th className="px-3.5 py-3 text-center w-12 border-r border-[#D9E5F5]">S.N.</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">ATM ID</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">Ticket Number</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">TXN Type</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">TXN ID</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">UTR</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">TXN Date</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">TXN Time</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">RRN</th>
                <th className="px-3.5 py-3 text-right border-r border-[#D9E5F5]">Amount (₹)</th>
                <th className="px-3.5 py-3 text-center border-r border-[#D9E5F5]">Status</th>
                <th className="px-3.5 py-3 text-center border-r border-[#D9E5F5]">TXN Slip</th>
                <th className="px-3.5 py-3 border-r border-[#D9E5F5]">Remarks</th>
                <th className="px-3.5 py-3 text-center sticky right-0 bg-[#EEF4FC] shadow-[-2px_0_4px_rgba(0,0,0,0.04)] w-28">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50/80 text-[#93C5FD]">
                        <FileText size={32} />
                      </div>
                      <h4 className="mt-3 text-[15px] font-bold text-[#1E293B]">No records found</h4>
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
                    <td className="px-3.5 py-3 text-center font-medium text-slate-500 border-r border-slate-100">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="px-3.5 py-3 font-semibold text-[#0066FF] border-r border-slate-100">
                      {r.atmId}
                    </td>

                    <td className="px-3.5 py-3 border-r border-slate-100">
                      <button
                        type="button"
                        onClick={() => navigate(`/operations/reconciliation/failed-txns/${r.id}`)}
                        className="font-semibold text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Open Filled Form"
                      >
                        {r.ticketNumber}
                        <ExternalLink size={11} className="opacity-60" />
                      </button>
                    </td>

                    <td className="px-3.5 py-3 border-r border-slate-100">
                      <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#0066FF] border border-blue-200/70">
                        {r.txnType}
                      </span>
                    </td>

                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-[#334155] border-r border-slate-100">
                      {r.txnId}
                    </td>

                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-500 border-r border-slate-100">
                      {r.utr || '-'}
                    </td>

                    <td className="px-3.5 py-3 text-[#334155] border-r border-slate-100">
                      {r.txnDate}
                    </td>

                    <td className="px-3.5 py-3 text-[#334155] border-r border-slate-100">
                      {r.txnTime}
                    </td>

                    <td className="px-3.5 py-3 font-mono text-[11.5px] text-slate-500 border-r border-slate-100">
                      {r.rrn || '-'}
                    </td>

                    <td className="px-3.5 py-3 text-right font-bold text-[#1E293B] border-r border-slate-100">
                      ₹ {Number(r.amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-3.5 py-3 text-center border-r border-slate-100">
                      {renderStatusBadge(r.status)}
                    </td>

                    <td className="px-3.5 py-3 text-center border-r border-slate-100">
                      {r.txnSlipName ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0066FF] max-w-[120px] truncate"
                          title={r.txnSlipName}
                        >
                          <FileText size={12} className="shrink-0" />
                          <span className="truncate">{r.txnSlipName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td
                      className="max-w-[200px] truncate px-3.5 py-3 text-[#64748B] border-r border-slate-100"
                      title={r.remarks}
                    >
                      {r.remarks || '-'}
                    </td>

                    {/* Action Column: View opens filled form page */}
                    <td className="px-3 py-2.5 whitespace-nowrap sticky right-0 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.03)] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/operations/reconciliation/failed-txns/${r.id}`)}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/80 transition-colors cursor-pointer"
                          title="View / Open Form"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/operations/reconciliation/failed-txns/${r.id}`)}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#0066FF] hover:bg-blue-50 border border-blue-200/80 transition-colors cursor-pointer"
                          title="Edit Dispute"
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

        {/* Table Footer / Pagination */}
        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-3 sm:flex-row sm:items-center sm:justify-between bg-white text-[12px] text-[#64748B]">
          <div>
            Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}{' '}
            records
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-[#0066FF] px-2 text-[12px] font-semibold text-white shadow-xs">
              {currentPage}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-900">Delete Dispute?</h4>
                <p className="text-[12px] text-slate-500">
                  This action will permanently remove this dispute record.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
