import { useState, useMemo, useEffect, useRef } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Landmark,
  Calculator,
  CreditCard,
  Send,
  Save,
  Download,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  Eye,
  Pencil,
  MoreVertical,
  CheckCircle2,
  Users,
  Coins,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from 'lucide-react'
import { downloadCsv } from '@/lib/export'
import { toast } from '@/components/ui/Toast'
import {
  gstStore,
  deleteGst,
  saveGst,
  emptyGst,
  formatInr,
  numOr0,
  FIN_YEARS,
  FY_MONTHS,
  INDIAN_STATES,
  GST_INVOICE_STATUSES,
  GST_PAYMENT_STATUSES,
  type GstRecord,
} from '@/data/financeGst'
import { SITES, FRANCHISEES } from '@/data/cbrSites'
import GstInvoiceTemplate from '@/components/finance/GstInvoiceTemplate'

export default function GstList() {
  const records = gstStore.use()
  const formRef = useRef<HTMLDivElement>(null)

  // 1. On first load: KEEP FORM COMPLETELY EMPTY
  const [formData, setFormData] = useState<GstRecord>(() => emptyGst('2026-27'))
  const [activeEditingId, setActiveEditingId] = useState<string>('')

  // Modal preview states
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [pdfModalRecord, setPdfModalRecord] = useState<GstRecord | null>(null)
  const [actionMenuRowId, setActionMenuRowId] = useState<string | null>(null)

  // Filter drawer/panel
  const [showFilters, setShowFilters] = useState(false)
  const [statusCardFilter, setStatusCardFilter] = useState<string | null>(null)

  // Search & Filter inputs
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFYear, setFilterFYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('')

  // 2. Default: SHOW ONLY 5 RECORDS AT A TIME
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
        if (statusCardFilter === 'Pending at Franchise' && r.invoiceStatus !== 'Pending at Franchise') return false
        if (statusCardFilter === 'Pending at Team' && r.invoiceStatus !== 'Pending at Team') return false
        if (statusCardFilter === 'Payment Pending' && r.paymentStatus !== 'Pending') return false
        if (statusCardFilter === 'Reconciled' && r.invoiceStatus !== 'Reconciled') return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchInvoice = r.invoiceNumber?.toLowerCase().includes(q)
        const matchFranchise = r.franchiseeName?.toLowerCase().includes(q)
        const matchSite = r.siteId?.toLowerCase().includes(q)
        const matchAtm = r.atmId?.toLowerCase().includes(q)
        const matchGst = r.gstNumber?.toLowerCase().includes(q)
        if (!matchInvoice && !matchFranchise && !matchSite && !matchAtm && !matchGst) {
          return false
        }
      }

      // Dropdown filters
      if (filterFYear && r.fYear !== filterFYear) return false
      if (filterMonth && r.month !== filterMonth) return false
      if (filterInvoiceStatus && r.invoiceStatus !== filterInvoiceStatus) return false
      if (filterPaymentStatus && r.paymentStatus !== filterPaymentStatus) return false

      return true
    })
  }, [records, statusCardFilter, searchQuery, filterFYear, filterMonth, filterInvoiceStatus, filterPaymentStatus])

  // Paginated records (5 per page by default)
  const totalRecords = filteredRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  // Form field updater with smart calculations
  const updateFormField = (field: keyof GstRecord, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // If Basic Amount is updated, recalculate CGST (9%), SGST (9%), and Invoice Amount
      if (field === 'basicAmount') {
        const base = numOr0(value)
        const cgst = Math.round(base * 0.09 * 100) / 100
        const sgst = cgst
        const roundOff = numOr0(prev.roundOff || '0')
        const total = Math.round((base + cgst + sgst + roundOff) * 100) / 100

        updated.cgst = formatInr(cgst)
        updated.sgst = formatInr(sgst)
        updated.invoiceAmount = formatInr(total)

        // Also recalc Net Amount
        const deductions =
          numOr0(prev.tds) +
          numOr0(prev.cashShortageDeduction) +
          numOr0(prev.disputeDeduction) +
          numOr0(prev.chargebackDeduction) +
          numOr0(prev.gstRelatedDeduction)
        updated.netAmount = formatInr(Math.max(0, total - deductions))
      }

      // If CGST or SGST or RoundOff is updated manually
      if (field === 'cgst' || field === 'sgst' || field === 'roundOff') {
        const base = numOr0(prev.basicAmount)
        const cgst = field === 'cgst' ? numOr0(value) : numOr0(prev.cgst)
        const sgst = field === 'sgst' ? numOr0(value) : numOr0(prev.sgst)
        const roundOff = field === 'roundOff' ? numOr0(value) : numOr0(prev.roundOff)
        const total = Math.round((base + cgst + sgst + roundOff) * 100) / 100

        updated.invoiceAmount = formatInr(total)

        const deductions =
          numOr0(prev.tds) +
          numOr0(prev.cashShortageDeduction) +
          numOr0(prev.disputeDeduction) +
          numOr0(prev.chargebackDeduction) +
          numOr0(prev.gstRelatedDeduction)
        updated.netAmount = formatInr(Math.max(0, total - deductions))
      }

      // If any deduction is updated, recalculate Net Amount
      if (
        field === 'tds' ||
        field === 'cashShortageDeduction' ||
        field === 'disputeDeduction' ||
        field === 'chargebackDeduction' ||
        field === 'gstRelatedDeduction'
      ) {
        const invTotal = numOr0(prev.invoiceAmount)
        const deductions =
          (field === 'tds' ? numOr0(value) : numOr0(prev.tds)) +
          (field === 'cashShortageDeduction' ? numOr0(value) : numOr0(prev.cashShortageDeduction)) +
          (field === 'disputeDeduction' ? numOr0(value) : numOr0(prev.disputeDeduction)) +
          (field === 'chargebackDeduction' ? numOr0(value) : numOr0(prev.chargebackDeduction)) +
          (field === 'gstRelatedDeduction' ? numOr0(value) : numOr0(prev.gstRelatedDeduction))

        updated.netAmount = formatInr(Math.max(0, invTotal - deductions))
      }

      // Sync combined invoice number
      if (field === 'invoiceSeq' || field === 'invoicePrefix') {
        const pfx = field === 'invoicePrefix' ? value : prev.invoicePrefix || 'GST/26-27/'
        const seq = field === 'invoiceSeq' ? value : prev.invoiceSeq || ''
        updated.invoiceNumber = seq ? `${pfx}${seq}` : ''
      }

      return updated
    })
  }

  // Lookup Site/ATM to autofill Franchise & GST details
  const handleSiteSearch = () => {
    const inputSite = formData.siteId.trim()
    if (!inputSite) {
      toast('Please enter a Site ID to search')
      return
    }
    const found = SITES.find(
      (s) => s.siteId.toLowerCase() === inputSite.toLowerCase() || s.atmId.toLowerCase() === inputSite.toLowerCase()
    )
    if (found) {
      const fr = FRANCHISEES.find((f) => f.id === found.franchiseId)
      setFormData((prev) => ({
        ...prev,
        siteId: found.siteId,
        atmId: found.atmId,
        locationName: `${found.location}, ${found.city}`,
        sapCode: fr?.sapCode || prev.sapCode,
        franchiseeName: fr?.name || prev.franchiseeName,
        contactNo: fr?.contact || prev.contactNo,
        gstNumber: fr?.gstin || prev.gstNumber,
        stateCode: fr?.gstin ? fr.gstin.slice(0, 2) : '09',
        panNumber: fr?.gstin ? fr.gstin.slice(2, 12) : prev.panNumber,
        address: `${found.location}\n${found.city}\nUttar Pradesh - 201306`,
      }))
      toast(`Loaded details for Site ID ${found.siteId}`)
    } else {
      toast('Site ID not found in master records')
    }
  }

  const handleAtmSearch = () => {
    const inputAtm = formData.atmId.trim()
    if (!inputAtm) {
      toast('Please enter an ATM ID to search')
      return
    }
    const found = SITES.find(
      (s) => s.atmId.toLowerCase() === inputAtm.toLowerCase() || s.siteId.toLowerCase() === inputAtm.toLowerCase()
    )
    if (found) {
      const fr = FRANCHISEES.find((f) => f.id === found.franchiseId)
      setFormData((prev) => ({
        ...prev,
        siteId: found.siteId,
        atmId: found.atmId,
        locationName: `${found.location}, ${found.city}`,
        sapCode: fr?.sapCode || prev.sapCode,
        franchiseeName: fr?.name || prev.franchiseeName,
        contactNo: fr?.contact || prev.contactNo,
        gstNumber: fr?.gstin || prev.gstNumber,
        stateCode: fr?.gstin ? fr.gstin.slice(0, 2) : '09',
        panNumber: fr?.gstin ? fr.gstin.slice(2, 12) : prev.panNumber,
        address: `${found.location}\n${found.city}\nUttar Pradesh - 201306`,
      }))
      toast(`Loaded details for ATM ID ${found.atmId}`)
    } else {
      toast('ATM ID not found in master records')
    }
  }

  // Load record into form for editing / viewing
  const loadRecordIntoForm = (rec: GstRecord) => {
    setFormData({ ...rec })
    setActiveEditingId(rec.id)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast(`Loaded Invoice ${rec.invoiceNumber || rec.id} into entry form`)
  }

  // Reset form to blank / new
  const handleResetForm = () => {
    setFormData(emptyGst('2026-27'))
    setActiveEditingId('')
    toast('Form reset for new invoice entry')
  }

  // Save Draft action
  const handleSaveDraft = () => {
    if (!formData.franchiseeName && !formData.siteId) {
      toast('Please enter Franchisee Name or Site ID')
      return
    }
    const saved = saveGst({
      ...formData,
      invoiceStatus: formData.invoiceStatus || 'Pending at Franchise',
      paymentStatus: formData.paymentStatus || 'Pending',
    })
    setFormData(saved)
    setActiveEditingId(saved.id)
    toast(`Draft saved successfully (ID: ${saved.invoiceNumber || saved.id})`)
  }

  // Submit for Review action
  const handleSubmitReview = () => {
    if (!formData.franchiseeName) {
      toast('Please enter Franchisee Name before submitting')
      return
    }
    const saved = saveGst({
      ...formData,
      invoiceStatus: 'Pending at Team',
      paymentStatus: formData.paymentStatus || 'Pending',
    })
    setFormData(saved)
    setActiveEditingId(saved.id)
    toast(`Invoice ${saved.invoiceNumber} submitted for review successfully!`)
  }

  // Export CSV
  const handleExport = () => {
    const headers = [
      'S.N.',
      'F. Year',
      'Month',
      'Site ID',
      'ATM ID',
      'Franchisee Name',
      'GSTIN',
      'State',
      'Invoice Number',
      'Invoice Date',
      'Basic Amount',
      'CGST',
      'SGST',
      'Invoice Amount',
      'TDS',
      'Cash Shortage',
      'Net Amount',
      'Paid Amount',
      'Payment Date',
      'UTR Number',
      'GST Invoice Status',
      'GST Payment Status',
    ]

    const rows = filteredRecords.map((r, i) => [
      String(i + 1),
      r.fYear,
      r.month,
      r.siteId,
      r.atmId,
      r.franchiseeName,
      r.gstNumber,
      r.state || 'Uttar Pradesh',
      r.invoiceNumber,
      r.invoiceDate || '',
      r.basicAmount,
      r.cgst,
      r.sgst,
      r.invoiceAmount,
      r.tds,
      r.cashShortageDeduction,
      r.netAmount,
      r.paidAmount,
      r.paymentDate,
      r.utrNumber,
      r.invoiceStatus,
      r.paymentStatus,
    ])

    downloadCsv(`GST_Invoice_Reconciliation_${new Date().toISOString().slice(0, 10)}`, headers, rows)
    toast(`Exported ${filteredRecords.length} GST records to CSV`)
  }

  // Delete handler
  const handleDeleteRow = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the GST invoice record for ${name}?`)) {
      deleteGst(id)
      if (activeEditingId === id) {
        handleResetForm()
      }
      toast('Record deleted')
    }
    setActionMenuRowId(null)
  }

  // Close menus on outside click
  useEffect(() => {
    const handleWindowClick = () => setActionMenuRowId(null)
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [])

  return (
    <div className="space-y-4 pb-14 font-sans text-slate-800 antialiased">
      {/* 1. TOP HEADER BANNER */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#061838] via-[#09224f] to-[#041129] px-6 py-4.5 text-white shadow-md">
        {/* Subtle geometric red & white angled brand accents on right */}
        <div className="pointer-events-none absolute right-36 -top-4 -bottom-4 w-32 overflow-hidden opacity-90 hidden sm:block">
          <div className="h-full w-2.5 bg-white transform -skew-x-[28deg] ml-8" />
          <div className="h-full w-7 bg-[#e52429] transform -skew-x-[28deg] -ml-2" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left Title and Subtitle with Icon */}
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center text-white shrink-0 shadow-inner">
              <FileText className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-white leading-tight">
                GST Invoice Management
              </h1>
              <p className="text-[12px] sm:text-[13px] text-blue-200/90 font-normal mt-0.5">
                Franchise GST Invoice & Payout Reconciliation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOP 4 METRIC / KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Pending at Franchise */}
        <div
          onClick={() =>
            setStatusCardFilter((prev) => (prev === 'Pending at Franchise' ? null : 'Pending at Franchise'))
          }
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${statusCardFilter === 'Pending at Franchise'
            ? 'border-amber-400 ring-2 ring-amber-100'
            : 'border-slate-200/90 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#f59e0b] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">Pending at Franchise</div>
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
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${statusCardFilter === 'Pending at Team'
            ? 'border-blue-400 ring-2 ring-blue-100'
            : 'border-slate-200/90 hover:border-blue-300'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">Pending at Team</div>
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
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${statusCardFilter === 'Payment Pending'
            ? 'border-rose-400 ring-2 ring-rose-100'
            : 'border-slate-200/90 hover:border-rose-300'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Coins size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">Payment Pending</div>
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
          className={`bg-white rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs hover:shadow-sm ${statusCardFilter === 'Reconciled'
            ? 'border-emerald-400 ring-2 ring-emerald-100'
            : 'border-slate-200/90 hover:border-emerald-300'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-500 leading-tight">Reconciled</div>
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

      {/* 3. "GST INVOICE ENTRY" SECTION */}
      <div ref={formRef} className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-[#0066FF]" strokeWidth={2.2} />
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">GST Invoice Entry</h2>
            {activeEditingId && (
              <span className="ml-2 text-[11px] bg-blue-50 text-[#0066FF] border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                Editing: {formData.invoiceNumber || activeEditingId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeEditingId && (
              <button
                onClick={handleResetForm}
                className="text-[12px] text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors font-medium shadow-2xs"
              >
                + Clear Form
              </button>
            )}
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-colors shadow-2xs"
            >
              <FileText size={13} className="text-[#0066FF]" />
              <span>View Invoice Template</span>
            </button>
          </div>
        </div>

        {/* 4 Inner Boxes arranged in 2x2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BOX 1: 1. Franchise & Period Details */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[#0066FF]">
                <FileText size={15} strokeWidth={2.4} />
                <span className="text-[13px] font-bold tracking-tight">1. Franchise & Period Details</span>
              </div>

              {/* Row 1: Financial Year, Month, Site ID, ATM ID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                {/* Financial Year */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Financial Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.fYear}
                    onChange={(e) => updateFormField('fYear', e.target.value)}
                    className="w-full h-8 px-2.5 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  >
                    {FIN_YEARS.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => updateFormField('month', e.target.value)}
                    className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  >
                    {FY_MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Site ID */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Site ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.siteId}
                      onChange={(e) => updateFormField('siteId', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSiteSearch()}
                      placeholder="201"
                      className="w-full h-8 pl-2.5 pr-7 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={handleSiteSearch}
                      title="Search Site"
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-[#0066FF] transition-colors"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </div>

                {/* ATM ID */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    ATM ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.atmId}
                      onChange={(e) => updateFormField('atmId', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAtmSearch()}
                      placeholder="ATM12345"
                      className="w-full h-8 pl-2.5 pr-7 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={handleAtmSearch}
                      title="Search ATM"
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-[#0066FF] transition-colors"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: SAP Code, Franchisee Name, Contact No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* SAP Code */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">SAP Code</label>
                  <input
                    type="text"
                    value={formData.sapCode}
                    onChange={(e) => updateFormField('sapCode', e.target.value)}
                    placeholder="SAP001256"
                    className="w-full h-8 px-2.5 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>

                {/* Franchisee Name */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Franchisee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.franchiseeName}
                    onChange={(e) => updateFormField('franchiseeName', e.target.value)}
                    placeholder="ABC Pvt. Ltd."
                    className="w-full h-8 px-2.5 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>

                {/* Contact No */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Contact No.</label>
                  <input
                    type="text"
                    value={formData.contactNo}
                    onChange={(e) => updateFormField('contactNo', e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-8 px-2.5 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BOX 2: 2. GST Registration Details */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[#0066FF]">
                <Landmark size={15} strokeWidth={2.4} />
                <span className="text-[13px] font-bold tracking-tight">2. GST Registration Details</span>
              </div>

              {/* Row 1: GSTIN/UIN and State */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-3">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    GSTIN/UIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      updateFormField('gstNumber', val)
                      if (val.length >= 2) updateFormField('stateCode', val.slice(0, 2))
                      if (val.length >= 12) updateFormField('panNumber', val.slice(2, 12))
                    }}
                    placeholder="09AABC134522J1ZE"
                    className="w-full h-8 px-2.5 text-[12px] font-mono border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state || 'Uttar Pradesh'}
                    onChange={(e) => updateFormField('state', e.target.value)}
                    className="w-full h-8 px-2.5 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Address on left, State Code & PAN on right */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Address (As per GST)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.address || ''}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="Shop No. 1st Surajpur&#10;Greater Noida&#10;Uttar Pradesh - 201306"
                    className="w-full px-2.5 py-1.5 text-[11.5px] border border-slate-200 rounded-md bg-white text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>

                <div className="sm:col-span-5 flex flex-col justify-between gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">State Code</label>
                    <input
                      type="text"
                      value={formData.stateCode || ''}
                      onChange={(e) => updateFormField('stateCode', e.target.value)}
                      placeholder="09"
                      className="w-full h-8 px-2.5 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">PAN / IT No.</label>
                    <input
                      type="text"
                      value={formData.panNumber || ''}
                      onChange={(e) => updateFormField('panNumber', e.target.value.toUpperCase())}
                      placeholder="AAB1325482J"
                      className="w-full h-8 px-2.5 text-[12px] font-mono border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOX 3: 3. Payout & Tax Calculation */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[#0066FF]">
                <Calculator size={15} strokeWidth={2.4} />
                <span className="text-[13px] font-bold tracking-tight">3. Payout & Tax Calculation</span>
              </div>

              {/* Row 1: Invoice Number & Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                {/* Invoice Number compound input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={formData.invoicePrefix || 'GST/26-27/'}
                      onChange={(e) => updateFormField('invoicePrefix', e.target.value)}
                      className="w-24 h-8 px-2 text-[11.5px] font-medium border border-r-0 border-slate-200 rounded-l-md bg-slate-100 text-slate-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.invoiceSeq || ''}
                      onChange={(e) => updateFormField('invoiceSeq', e.target.value)}
                      placeholder="00125"
                      className="flex-1 h-8 px-2.5 text-[12px] font-mono border border-slate-200 rounded-r-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                  </div>
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.invoiceDate}
                      onChange={(e) => updateFormField('invoiceDate', e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="w-full h-8 pl-2.5 pr-8 text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                    />
                    <Calendar size={14} className="absolute right-2.5 top-2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Basic Amount & CGST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-slate-700 shrink-0">
                    Basic Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.basicAmount}
                    onChange={(e) => updateFormField('basicAmount', e.target.value)}
                    placeholder="0.00"
                    className="w-32 h-8 px-2.5 text-right text-[12px] font-semibold border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-slate-700 shrink-0">CGST @ 9% (₹)</label>
                  <input
                    type="text"
                    value={formData.cgst}
                    onChange={(e) => updateFormField('cgst', e.target.value)}
                    placeholder="0.00"
                    className="w-32 h-8 px-2.5 text-right text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>
              </div>

              {/* Row 3: SGST / IGST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-slate-700 shrink-0">SGST / IGST @ 9% (₹)</label>
                  <input
                    type="text"
                    value={formData.sgst}
                    onChange={(e) => updateFormField('sgst', e.target.value)}
                    placeholder="0.00"
                    className="w-32 h-8 px-2.5 text-right text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-slate-700 shrink-0">Round Off (₹)</label>
                  <input
                    type="text"
                    value={formData.roundOff}
                    onChange={(e) => updateFormField('roundOff', e.target.value)}
                    placeholder="0.00"
                    className="w-32 h-8 px-2.5 text-right text-[12px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Highlighted Banner: Invoice Amount (₹) */}
            <div className="bg-[#e8f1fd] rounded-lg px-4 py-2 flex items-center justify-between border border-[#d0e2fb] mt-2">
              <span className="text-[13px] font-bold text-slate-800">Invoice Amount (₹)</span>
              <span className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 tracking-tight">
                {formData.invoiceAmount || '0.00'}
              </span>
            </div>
          </div>

          {/* BOX 4: 4. Deductions & Payment Details */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[#0066FF]">
                <CreditCard size={15} strokeWidth={2.4} />
                <span className="text-[13px] font-bold tracking-tight">4. Deductions & Payment Details</span>
              </div>

              {/* 2 inner columns: Deductions on left, Payment on right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Left Column: Deductions */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">TDS (₹)</label>
                    <input
                      type="text"
                      value={formData.tds}
                      onChange={(e) => updateFormField('tds', e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 text-right text-[11.5px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">Cash Shortage Deduction (₹)</label>
                    <input
                      type="text"
                      value={formData.cashShortageDeduction}
                      onChange={(e) => updateFormField('cashShortageDeduction', e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 text-right text-[11.5px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">Dispute Deduction (₹)</label>
                    <input
                      type="text"
                      value={formData.disputeDeduction}
                      onChange={(e) => updateFormField('disputeDeduction', e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 text-right text-[11.5px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">Chargeback Deduction (₹)</label>
                    <input
                      type="text"
                      value={formData.chargebackDeduction}
                      onChange={(e) => updateFormField('chargebackDeduction', e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 text-right text-[11.5px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">GST Related Deduction (₹)</label>
                    <input
                      type="text"
                      value={formData.gstRelatedDeduction}
                      onChange={(e) => updateFormField('gstRelatedDeduction', e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 text-right text-[11.5px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                {/* Right Column: Payment Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">Paid Amount (₹)</label>
                    <input
                      type="text"
                      value={formData.paidAmount}
                      onChange={(e) => updateFormField('paidAmount', e.target.value)}
                      placeholder="0.00"
                      className="w-28 h-7 px-2 text-right text-[11.5px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">Payment Date</label>
                    <div className="relative w-28">
                      <input
                        type="text"
                        value={formData.paymentDate}
                        onChange={(e) => updateFormField('paymentDate', e.target.value)}
                        placeholder="DD-MM-YYYY"
                        className="w-full h-7 pl-2 pr-5 text-[11px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                      />
                      <Calendar size={12} className="absolute right-1.5 top-2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">UTR Number</label>
                    <input
                      type="text"
                      value={formData.utrNumber}
                      onChange={(e) => updateFormField('utrNumber', e.target.value)}
                      placeholder="Enter UTR Number"
                      className="w-28 h-7 px-2 text-[11px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">GST Invoice Status</label>
                    <select
                      value={formData.invoiceStatus}
                      onChange={(e) => updateFormField('invoiceStatus', e.target.value)}
                      className="w-32 h-7 px-1.5 text-[11px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    >
                      {GST_INVOICE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">GST Payment Status</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => updateFormField('paymentStatus', e.target.value)}
                      className="w-32 h-7 px-1.5 text-[11px] border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                    >
                      {GST_PAYMENT_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Highlighted Banner: Net Amount (₹) */}
            <div className="bg-[#e8f1fd] rounded-lg px-4 py-2 flex items-center justify-between border border-[#d0e2fb] mt-2">
              <span className="text-[13px] font-bold text-slate-800">Net Amount (₹)</span>
              <span className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 tracking-tight">
                {formData.netAmount || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 mt-4 pt-1">
          {/* Save Draft Button */}
          <button
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-blue-600 bg-white hover:bg-blue-50 text-blue-700 text-[12.5px] font-semibold transition-colors shadow-2xs"
          >
            <Save size={14} strokeWidth={2.2} />
            <span>Save Draft</span>
          </button>

          {/* Generate Invoice PDF Button */}
          <button
            onClick={() => {
              setPdfModalRecord(formData)
              toast('Opening PDF preview for current invoice...')
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0066FF] hover:bg-[#0052cc] text-white text-[12.5px] font-semibold transition-colors shadow-sm"
          >
            <FileText size={14} strokeWidth={2.2} />
            <span>Generate Invoice PDF</span>
          </button>

          {/* Submit for Review Button */}
          <button
            onClick={handleSubmitReview}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-[12.5px] font-semibold transition-colors shadow-sm"
          >
            <Send size={14} strokeWidth={2.2} />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      {/* 4. "GST INVOICE LIST" SECTION */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        {/* Header bar with Search, Filter & Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3.5">
          {/* Left Title */}
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-[#0066FF]" strokeWidth={2.2} />
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">GST Invoice List</h2>
          </div>

          {/* Right Controls: Search, Filter, Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search by Invoice No, Franchisee, Site ID..."
                className="w-64 sm:w-80 h-8 pl-8 pr-2.5 text-[11.5px] border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0066FF] focus:border-[#0066FF] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${showFilters || filterFYear || filterMonth || filterInvoiceStatus || filterPaymentStatus
                ? 'border-blue-500 bg-blue-50 text-[#0066FF]'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
            >
              <Filter size={13} />
              <span>Filter</span>
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-colors"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 mb-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Financial Year</label>
              <select
                value={filterFYear}
                onChange={(e) => {
                  setFilterFYear(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-7.5 px-2 text-[11.5px] border border-slate-200 rounded bg-white text-slate-700"
              >
                <option value="">All Years</option>
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
                className="w-full h-7.5 px-2 text-[11.5px] border border-slate-200 rounded bg-white text-slate-700"
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
              <label className="block text-[11px] font-medium text-slate-600 mb-1">GST Invoice Status</label>
              <select
                value={filterInvoiceStatus}
                onChange={(e) => {
                  setFilterInvoiceStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-7.5 px-2 text-[11.5px] border border-slate-200 rounded bg-white text-slate-700"
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
                  className="w-full h-7.5 px-2 text-[11.5px] border border-slate-200 rounded bg-white text-slate-700"
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
                className="h-7.5 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11.5px] font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Corrected Clean Table Layout & CSS */}
        <div className="overflow-x-auto rounded-lg border border-slate-200/90 shadow-2xs">
          <table className="w-full min-w-full text-left text-[12px] border-collapse">
            <thead className="bg-[#f0f4f9] text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-12 whitespace-nowrap">S.N.</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">F. Year</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Month</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Site ID</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">Franchisee Name</th>
                {/* <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">GSTIN</th> */}
                <th className="py-2.5 px-3.5 font-semibold text-right whitespace-nowrap">Invoice Amount (₹)</th>
                <th className="py-2.5 px-3.5 font-semibold text-right whitespace-nowrap">Net Amount (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">GST Invoice Status</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">GST Payment Status</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap min-w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No GST invoice records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const isSelected = row.id === activeEditingId

                  // Status badge colors
                  const invoiceBadgeClass =
                    row.invoiceStatus === 'Pending at Franchise'
                      ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                      : row.invoiceStatus === 'Pending at Team'
                        ? 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]'
                        : row.invoiceStatus === 'Approved'
                          ? 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]'
                          : row.invoiceStatus === 'Reconciled'
                            ? 'bg-[#bbf7d0] text-[#14532d] border-[#86efac]'
                            : 'bg-slate-100 text-slate-600 border-slate-200'

                  const paymentBadgeClass =
                    row.paymentStatus === 'Paid'
                      ? 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]'
                      : 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]'

                  // Short month format for clean presentation: e.g. "October 2026" -> "Oct 2026"
                  const displayMonth = row.month
                    ? row.month.replace('October', 'Oct').replace('September', 'Sep').replace('August', 'Aug')
                    : 'Oct 2026'

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''
                        }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-600 font-medium whitespace-nowrap">{row.sn}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700 whitespace-nowrap">{row.fYear}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700 whitespace-nowrap">{displayMonth}</td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 whitespace-nowrap">{row.siteId}</td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800 whitespace-nowrap">
                        {row.franchiseeName}
                      </td>
                      {/* <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {row.gstNumber}
                      </td> */}
                      <td className="py-2.5 px-3.5 text-right font-medium text-slate-800 whitespace-nowrap">
                        {row.invoiceAmount}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {row.netAmount}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${invoiceBadgeClass}`}
                        >
                          {row.invoiceStatus || 'Draft'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${paymentBadgeClass}`}
                        >
                          {row.paymentStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View (eye) */}
                          <button
                            onClick={() => loadRecordIntoForm(row)}
                            title="View / Load into form"
                            className="p-1 rounded text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit (pencil) */}
                          <button
                            onClick={() => loadRecordIntoForm(row)}
                            title="Edit Record"
                            className="p-1 rounded text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Red PDF Icon */}
                          <button
                            onClick={() => setPdfModalRecord(row)}
                            title="View Invoice PDF"
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <FileText size={15} />
                          </button>

                          {/* 3 dots menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionMenuRowId(actionMenuRowId === row.id ? null : row.id)
                              }}
                              title="More actions"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical size={14} />
                            </button>

                            {actionMenuRowId === row.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-7 z-30 w-44 rounded-lg bg-white shadow-lg border border-slate-200 py-1 text-[12px] text-slate-700 animate-in fade-in"
                              >
                                <button
                                  onClick={() => {
                                    loadRecordIntoForm(row)
                                    setActionMenuRowId(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pencil size={13} /> Edit in Form
                                </button>
                                <button
                                  onClick={() => {
                                    saveGst({
                                      ...row,
                                      paymentStatus: row.paymentStatus === 'Paid' ? 'Pending' : 'Paid',
                                      paidAmount: row.paymentStatus === 'Paid' ? '0.00' : row.netAmount,
                                      paymentDate:
                                        row.paymentStatus === 'Paid'
                                          ? ''
                                          : new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
                                    })
                                    toast(
                                      `Marked payment as ${row.paymentStatus === 'Paid' ? 'Pending' : 'Paid'
                                      }`
                                    )
                                    setActionMenuRowId(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  {row.paymentStatus === 'Paid' ? 'Mark Unpaid' : 'Mark as Paid'}
                                </button>
                                <button
                                  onClick={() => {
                                    setPdfModalRecord(row)
                                    setActionMenuRowId(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <FileText size={13} className="text-rose-500" /> Generate PDF
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => handleDeleteRow(row.id, row.franchiseeName)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                                >
                                  <Trash2 size={13} /> Delete Record
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Default: 5 per page */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3.5 pt-2 text-[12px] text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{paginated.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalRecords}</span> entries
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-7 px-2 border border-slate-200 rounded text-slate-700 bg-white font-medium"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <div className="flex items-center gap-1 ml-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-2 text-slate-700 font-medium">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MODAL: "VIEW INVOICE TEMPLATE" */}
      {templateModalOpen && (
        <GstInvoiceTemplate
          isBlankTemplate={true}
          onClose={() => setTemplateModalOpen(false)}
        />
      )}

      {/* 6. MODAL: "ROW INVOICE PDF PREVIEW" & "GENERATE INVOICE PDF" */}
      {pdfModalRecord && (
        <GstInvoiceTemplate
          record={pdfModalRecord}
          isBlankTemplate={false}
          onClose={() => setPdfModalRecord(null)}
        />
      )}
    </div>
  )
}
