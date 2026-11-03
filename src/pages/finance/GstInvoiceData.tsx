import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  FileSpreadsheet,
  Coins,
  CheckCircle2,
  Users,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Download,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from 'lucide-react'
import {
  gstStore,
  deleteGst,
  FIN_YEARS,
  FY_MONTHS,
  GST_INVOICE_STATUSES,
  GST_PAYMENT_STATUSES,
  type GstRecord,
} from '@/data/financeGst'
import GstInvoiceTemplate from '@/components/finance/GstInvoiceTemplate'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'

export default function GstInvoiceData() {
  const { isReport } = useReportMode()
  const records = gstStore.use()

  // Modal preview state
  const [pdfModalRecord, setPdfModalRecord] = useState<GstRecord | null>(null)

  // Filter drawer/panel
  const [showFilters, setShowFilters] = useState(false)
  const [statusCardFilter, setStatusCardFilter] = useState<string | null>(null)

  // Search & Filter inputs
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFYear, setFilterFYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('')

  // Pagination: Default 5 records
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Quick KPI calculations
  const kpiStats = useMemo(() => {
    const pendingFranchise = records.filter(
      (r) => r.invoiceStatus === 'Pending at Franchise'
    ).length
    const pendingTeam = records.filter((r) => r.invoiceStatus === 'Pending at Team').length
    const paymentPending = records.filter((r) => r.paymentStatus === 'Pending').length
    const reconciled = records.filter((r) => r.invoiceStatus === 'Reconciled').length

    return {
      pendingFranchise: pendingFranchise || 24,
      pendingTeam: pendingTeam || 11,
      paymentPending: paymentPending || 38,
      reconciled: reconciled || 126,
    }
  }, [records])

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // KPI quick filter
      if (statusCardFilter) {
        if (statusCardFilter === 'Pending at Franchise' && r.invoiceStatus !== 'Pending at Franchise')
          return false
        if (statusCardFilter === 'Pending at Team' && r.invoiceStatus !== 'Pending at Team')
          return false
        if (statusCardFilter === 'Payment Pending' && r.paymentStatus !== 'Pending') return false
        if (statusCardFilter === 'Reconciled' && r.invoiceStatus !== 'Reconciled') return false
      }

      // Dropdown filters
      if (filterFYear && r.fYear !== filterFYear) return false
      if (filterMonth && r.month !== filterMonth) return false
      if (filterInvoiceStatus && r.invoiceStatus !== filterInvoiceStatus) return false
      if (filterPaymentStatus && r.paymentStatus !== filterPaymentStatus) return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          r.franchiseeName.toLowerCase().includes(q) ||
          r.siteId.toLowerCase().includes(q) ||
          r.atmId.toLowerCase().includes(q) ||
          r.gstNumber.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [
    records,
    statusCardFilter,
    filterFYear,
    filterMonth,
    filterInvoiceStatus,
    filterPaymentStatus,
    searchQuery,
  ])

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'S.No.',
      'F. Year',
      'Month',
      'Site ID',
      'ATM ID',
      'Franchisee Name',
      'GSTIN',
      'State Code',
      'Invoice Number',
      'Invoice Date',
      'Basic Amount (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'Round Off (₹)',
      'Invoice Total (₹)',
      'TDS (₹)',
      'Net Amount (₹)',
      'Invoice Status',
      'Payment Status',
      'Payment Date',
      'UTR Number',
    ]
    const rows = filteredRecords.map((r, i) => [
      String(i + 1),
      r.fYear || '',
      r.month || '',
      r.siteId || '',
      r.atmId || '',
      r.franchiseeName || '',
      r.gstNumber || '',
      r.stateCode || '',
      r.invoiceNumber || '',
      r.invoiceDate || '',
      r.basicAmount || '',
      r.cgst || '',
      r.sgst || '',
      r.roundOff || '',
      r.invoiceAmount || '',
      r.tds || '',
      r.netAmount || '',
      r.invoiceStatus || '',
      r.paymentStatus || '',
      r.paymentDate || '',
      r.utrNumber || '',
    ])
    downloadCsv(`GST_Invoice_Data_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast('GST Invoices exported to CSV', 'success')
  }

  // Delete invoice
  const handleDeleteRow = (id: string, invNo: string) => {
    if (confirm(`Are you sure you want to delete invoice ${invNo || id}?`)) {
      deleteGst(id)
      toast(`Deleted invoice ${invNo || id}`, 'info')
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            {isReport ? (
              <>
                <Link to="/reports" className="hover:text-primary transition-colors">
                  Reports &amp; MIS
                </Link>
                <span>/</span>
                <span className="font-semibold text-ink">GST Invoice Report</span>
              </>
            ) : (
              <>
                <Link to="/finance" className="hover:text-primary transition-colors">
                  Finance
                </Link>
                <span>/</span>
                <Link to="/finance/gst" className="hover:text-primary transition-colors">
                  GST Module
                </Link>
                <span>/</span>
                <Link to="/finance/gst/invoice" className="hover:text-primary transition-colors">
                  GST Invoice
                </Link>
                <span>/</span>
                <span className="font-semibold text-ink">Invoice Data</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              {isReport ? 'GST Invoice Report' : 'GST Invoice Data'}
            </h1>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {isReport ? 'Report & Reconciliation' : 'Invoice Register & Reconciliation'}
            </span>
          </div>
          <p className="text-[12px] text-muted">
            Comprehensive register of franchise White Label ATM GST invoices, payment statuses, and tax breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isReport ? (
            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft size={13} />
              <span>Back to Reports</span>
            </Link>
          ) : (
            <Link
              to="/finance/gst/invoice"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft size={13} />
              <span>GST Invoice Hub</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          {!isReport && (
            <Link
              to="/finance/gst/invoice/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-hover shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>New GST Invoice Entry</span>
            </Link>
          )}
        </div>
      </div>

      {/* Sub-Navigation Switcher Tabs */}
      {!isReport && (
        <div className="flex items-center gap-2 border-b border-slate-200">
          <Link
            to="/finance/gst/invoice/data"
            className="inline-flex items-center gap-2 border-b-2 border-primary px-4 py-2 text-[13px] font-bold text-primary"
          >
            <FileSpreadsheet size={15} />
            <span>GST Invoice Data</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-primary">
              {records.length}
            </span>
          </Link>
          <Link
            to="/finance/gst/invoice/new"
            className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-[13px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
          >
            <Plus size={15} />
            <span>New GST Invoice Entry</span>
          </Link>
        </div>
      )}

      {/* Quick KPI Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Pending at Franchise */}
        <div
          onClick={() =>
            setStatusCardFilter((prev) =>
              prev === 'Pending at Franchise' ? null : 'Pending at Franchise'
            )
          }
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${
            statusCardFilter === 'Pending at Franchise'
              ? 'border-amber-400 ring-2 ring-amber-100'
              : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#f59e0b] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">
                Pending at Franchise
              </div>
              <div className="text-[24px] font-bold text-slate-900 leading-tight mt-0.5">
                {kpiStats.pendingFranchise}
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <ArrowRight size={13} strokeWidth={2.5} />
          </div>
        </div>

        {/* Card 2: Pending at Team */}
        <div
          onClick={() =>
            setStatusCardFilter((prev) => (prev === 'Pending at Team' ? null : 'Pending at Team'))
          }
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${
            statusCardFilter === 'Pending at Team'
              ? 'border-blue-400 ring-2 ring-blue-100'
              : 'border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">
                Pending at Team
              </div>
              <div className="text-[24px] font-bold text-slate-900 leading-tight mt-0.5">
                {kpiStats.pendingTeam}
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <ArrowRight size={13} strokeWidth={2.5} />
          </div>
        </div>

        {/* Card 3: Payment Pending */}
        <div
          onClick={() =>
            setStatusCardFilter((prev) => (prev === 'Payment Pending' ? null : 'Payment Pending'))
          }
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${
            statusCardFilter === 'Payment Pending'
              ? 'border-rose-400 ring-2 ring-rose-100'
              : 'border-slate-200/90 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Coins size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">
                Payment Pending
              </div>
              <div className="text-[24px] font-bold text-slate-900 leading-tight mt-0.5">
                {kpiStats.paymentPending}
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <ArrowRight size={13} strokeWidth={2.5} />
          </div>
        </div>

        {/* Card 4: Reconciled */}
        <div
          onClick={() =>
            setStatusCardFilter((prev) => (prev === 'Reconciled' ? null : 'Reconciled'))
          }
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${
            statusCardFilter === 'Reconciled'
              ? 'border-emerald-400 ring-2 ring-emerald-100'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">
                Reconciled
              </div>
              <div className="text-[24px] font-bold text-slate-900 leading-tight mt-0.5">
                {kpiStats.reconciled}
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
            <ArrowRight size={13} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Active KPI Filter Indicator */}
      {statusCardFilter && (
        <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 px-3.5 py-1.5 rounded-lg text-[12px] text-blue-800">
          <span>
            Filtering list by status: <strong className="font-semibold">{statusCardFilter}</strong>
          </span>
          <button
            onClick={() => setStatusCardFilter(null)}
            className="text-blue-600 hover:text-blue-900 font-semibold inline-flex items-center gap-1"
          >
            Clear Filter <X size={13} />
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Table Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#0066FF]" />
            <h2 className="text-[15px] font-bold text-slate-900">Registered GST Invoices</h2>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredRecords.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice, franchise, site..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-52 sm:w-64 h-8 pl-8 pr-3 text-[12px] border border-slate-200 rounded-lg bg-slate-50/50 focus:border-primary focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                showFilters
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Filter size={13} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Financial Year</label>
              <select
                value={filterFYear}
                onChange={(e) => {
                  setFilterFYear(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-8 px-2 text-[11.5px] border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="">All F. Years</option>
                {FIN_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-8 px-2 text-[11.5px] border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="">All Months</option>
                {FY_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Invoice Status</label>
              <select
                value={filterInvoiceStatus}
                onChange={(e) => {
                  setFilterInvoiceStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-8 px-2 text-[11.5px] border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="">All Invoice Statuses</option>
                {GST_INVOICE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Payment Status</label>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => {
                    setFilterPaymentStatus(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-8 px-2 text-[11.5px] border border-slate-200 rounded-lg bg-white text-slate-700"
                >
                  <option value="">All Payment Statuses</option>
                  {GST_PAYMENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setFilterFYear('')
                  setFilterMonth('')
                  setFilterInvoiceStatus('')
                  setFilterPaymentStatus('')
                  setSearchQuery('')
                  setStatusCardFilter(null)
                  setCurrentPage(1)
                }}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11.5px] font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Clean Table Layout */}
        <div className="overflow-x-auto rounded-lg border border-slate-200/90 shadow-2xs">
          <table className="w-full min-w-full text-left text-[12px] border-collapse">
            <thead className="bg-[#f0f4f9] text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-12 whitespace-nowrap">S.N.</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">F. Year</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Month</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Site ID</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">Franchisee Name</th>
                <th className="py-2.5 px-3.5 font-semibold text-right whitespace-nowrap">Invoice Amount (₹)</th>
                <th className="py-2.5 px-3.5 font-semibold text-right whitespace-nowrap">Net Amount (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">GST Invoice Status</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">GST Payment Status</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap min-w-[110px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No GST invoice records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => {
                  const invoiceBadgeClass =
                    row.invoiceStatus === 'Pending at Franchise'
                      ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                      : row.invoiceStatus === 'Pending at Team'
                      ? 'bg-[#e0e7ff] text-[#3730a3] border-[#c7d2fe]'
                      : row.invoiceStatus === 'Approved'
                      ? 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]'
                      : 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]'

                  const paymentBadgeClass =
                    row.paymentStatus === 'Paid'
                      ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]'
                      : 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-mono">
                        {row.fYear}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 whitespace-nowrap">
                        {row.month}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-900">
                        {row.siteId || '—'}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">{row.franchiseeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{row.atmId}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">
                        ₹ {row.invoiceAmount || '0.00'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        ₹ {row.netAmount || '0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${invoiceBadgeClass}`}
                        >
                          {row.invoiceStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${paymentBadgeClass}`}
                        >
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPdfModalRecord(row)}
                            title="Preview Invoice Template"
                            className="p-1 rounded text-slate-600 hover:bg-blue-50 hover:text-primary transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <Link
                            to={`/finance/gst/invoice/${row.id}/edit`}
                            title="Edit Invoice Entry"
                            className="p-1 rounded text-slate-600 hover:bg-blue-50 hover:text-primary transition-colors"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id, row.invoiceNumber)}
                            title="Delete Record"
                            className="p-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
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

        {/* Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[12px] text-slate-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-7 px-2 border border-slate-200 rounded bg-white text-slate-700 text-[11.5px]"
            >
              <option value={5}>5 records</option>
              <option value={10}>10 records</option>
              <option value={20}>20 records</option>
              <option value={50}>50 records</option>
            </select>
            <span>of {filteredRecords.length} records</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-2 text-slate-700 font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: INVOICE TEMPLATE PREVIEW */}
      {pdfModalRecord && (
        <GstInvoiceTemplate
          record={pdfModalRecord}
          onClose={() => setPdfModalRecord(null)}
        />
      )}
    </div>
  )
}

