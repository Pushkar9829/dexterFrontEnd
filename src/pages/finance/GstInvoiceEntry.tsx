import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FileSpreadsheet,
  Save,
  ArrowLeft,
  Search,
  Eye,
  RotateCcw,
  Building2,
  Calculator,
  CheckCircle2,
  Receipt,
  Plus,
} from 'lucide-react'
import {
  saveGst,
  emptyGst,
  getGst,
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
import { toast } from '@/components/ui/Toast'

export default function GstInvoiceEntry() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const isEditing = Boolean(id && id !== 'new')

  // Form State
  const [formData, setFormData] = useState<GstRecord>(() => {
    if (isEditing && id) {
      const found = getGst(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    return emptyGst('2026-27')
  })

  // Template preview modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // Effect to load editing record if id changes
  useEffect(() => {
    if (isEditing && id) {
      const found = getGst(id)
      if (found) {
        setFormData(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isEditing])

  // Field change handler with automatic tax and net amount recalculation
  const handleFieldChange = (field: keyof GstRecord, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // When basicAmount is updated, auto-calculate 9% CGST, 9% SGST, Total, and Net
      if (field === 'basicAmount') {
        const base = numOr0(value)
        const cgst = Math.round(base * 0.09 * 100) / 100
        const sgst = Math.round(base * 0.09 * 100) / 100
        const ro = numOr0(prev.roundOff)
        const total = Math.round((base + cgst + sgst + ro) * 100) / 100

        updated.cgst = formatInr(cgst)
        updated.sgst = formatInr(sgst)
        updated.invoiceAmount = formatInr(total)

        const deductions =
          numOr0(prev.tds) +
          numOr0(prev.cashShortageDeduction) +
          numOr0(prev.disputeDeduction) +
          numOr0(prev.chargebackDeduction) +
          numOr0(prev.gstRelatedDeduction)
        updated.netAmount = formatInr(Math.max(0, total - deductions))
      }

      // If CGST, SGST, or RoundOff is updated manually
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
      toast('Please enter a Site ID to search', 'error')
      return
    }
    const found = SITES.find(
      (s) =>
        s.siteId.toLowerCase() === inputSite.toLowerCase() ||
        s.atmId.toLowerCase() === inputSite.toLowerCase()
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
      toast(`Loaded details for Site ${found.siteId}`, 'success')
    } else {
      toast('Site ID not found in master registry', 'error')
    }
  }

  const handleAtmSearch = () => {
    const inputAtm = formData.atmId.trim()
    if (!inputAtm) {
      toast('Please enter an ATM ID to search', 'error')
      return
    }
    const found = SITES.find((s) => s.atmId.toLowerCase() === inputAtm.toLowerCase())
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
      toast(`Loaded details for ATM ${found.atmId}`, 'success')
    } else {
      toast('ATM ID not found in master records', 'error')
    }
  }

  // Reset Form
  const handleResetForm = () => {
    setFormData(emptyGst('2026-27'))
    toast('Form cleared', 'info')
  }

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.siteId && !formData.atmId && !formData.franchiseeName) {
      toast('Please provide at least a Franchisee Name, Site ID, or ATM ID', 'error')
      return
    }

    if (!formData.basicAmount || numOr0(formData.basicAmount) <= 0) {
      toast('Please enter a valid Basic / Taxable Amount', 'error')
      return
    }

    // Auto-generate invoice number if empty
    const finalInvNo =
      formData.invoiceNumber ||
      `GST/26-27/${String(Math.floor(Math.random() * 90000) + 10000)}`

    const recordToSave: GstRecord = {
      ...formData,
      invoiceNumber: finalInvNo,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin (Dexter Finance)',
    }

    saveGst(recordToSave)
    toast(
      isEditing
        ? `Invoice ${finalInvNo} updated successfully!`
        : `GST Invoice ${finalInvNo} created and registered!`,
      'success'
    )

    // Navigate to GST Invoice Data page
    navigate('/finance/gst/invoice/data')
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
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
            <span className="font-semibold text-ink">
              {isEditing ? 'Edit Invoice Entry' : 'New Invoice Entry'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              {isEditing ? `Edit GST Invoice: ${formData.invoiceNumber}` : 'New GST Invoice Entry'}
            </h1>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {isEditing ? 'Editing Mode' : 'New Billing'}
            </span>
          </div>
          <p className="text-[12px] text-muted">
            Generate, calculate tax splits, and submit official White Label ATM GST invoices for franchises.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/finance/gst/invoice/data"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft size={13} />
            <span>Back to Invoice Data</span>
          </Link>
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw size={13} />
            <span>Clear Form</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Eye size={13} />
            <span>Preview Template</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <Link
          to="/finance/gst/invoice/data"
          className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-[13px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
        >
          <FileSpreadsheet size={15} />
          <span>GST Invoice Data</span>
        </Link>
        <Link
          to="/finance/gst/invoice/new"
          className="inline-flex items-center gap-2 border-b-2 border-primary px-4 py-2 text-[13px] font-bold text-primary"
        >
          <Plus size={15} />
          <span>New GST Invoice Entry</span>
        </Link>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleFormSubmit} className="space-y-5">
        {/* Section 1: Financial Period & Franchise Lookup */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Building2 size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-slate-900">
              1. Financial Period & Franchise / Site Information
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Financial Year *
              </label>
              <select
                value={formData.fYear}
                onChange={(e) => handleFieldChange('fYear', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:border-primary focus:outline-hidden"
              >
                {FIN_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Month *</label>
              <select
                value={formData.month}
                onChange={(e) => handleFieldChange('month', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:border-primary focus:outline-hidden"
              >
                {FY_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* ATM ID with Search */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">ATM ID</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="e.g. DX-MH-01482"
                  value={formData.atmId}
                  onChange={(e) => handleFieldChange('atmId', e.target.value)}
                  className="flex-1 h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAtmSearch}
                  title="Lookup ATM details"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold"
                >
                  <Search size={12} />
                </button>
              </div>
            </div>

            {/* Site ID with Search */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Site ID</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="e.g. ST-MH-PUN-00124"
                  value={formData.siteId}
                  onChange={(e) => handleFieldChange('siteId', e.target.value)}
                  className="flex-1 h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSiteSearch}
                  title="Lookup Site details"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold"
                >
                  <Search size={12} />
                </button>
              </div>
            </div>

            {/* Franchisee Name */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Franchisee Name *
              </label>
              <input
                type="text"
                required
                placeholder="Franchisee / Business Name"
                value={formData.franchiseeName}
                onChange={(e) => handleFieldChange('franchiseeName', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Contact No */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Contact Number</label>
              <input
                type="text"
                placeholder="e.g. +91 98220 41124"
                value={formData.contactNo}
                onChange={(e) => handleFieldChange('contactNo', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Franchise GSTIN
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 27AAKFS4821K1Z6"
                value={formData.gstNumber}
                onChange={(e) => handleFieldChange('gstNumber', e.target.value.toUpperCase())}
                className="w-full h-8 px-2 text-[12px] font-mono font-bold text-primary border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* State / Place of Supply */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                State / Jurisdiction
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:border-primary focus:outline-hidden"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Address */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Site Location & Billing Address
              </label>
              <input
                type="text"
                placeholder="Full site location and street address"
                value={formData.locationName || formData.address}
                onChange={(e) => handleFieldChange('locationName', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoice Particulars */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Receipt size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-slate-900">
              2. Invoice Particulars & Billing Scope
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix || 'GST/26-27/'}
                onChange={(e) => handleFieldChange('invoicePrefix', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-slate-50 focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Sequence Number</label>
              <input
                type="text"
                placeholder="e.g. 00142"
                value={formData.invoiceSeq || ''}
                onChange={(e) => handleFieldChange('invoiceSeq', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Generated Invoice Number
              </label>
              <input
                type="text"
                placeholder="Auto-generated or custom"
                value={formData.invoiceNumber}
                onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono font-bold text-slate-900 border border-slate-200 rounded-lg bg-slate-50 focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Invoice Date</label>
              <input
                type="text"
                placeholder="DD-MM-YYYY"
                value={formData.invoiceDate || '01-11-2026'}
                onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Value & Tax Calculations */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Calculator size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-slate-900">
              3. Revenue, Tax Split & Deduction Calculations
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Basic / Taxable Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Basic / Taxable Amount (₹) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50000.00"
                value={formData.basicAmount}
                onChange={(e) => handleFieldChange('basicAmount', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono font-bold text-primary border-2 border-blue-200 rounded-lg bg-blue-50/30 focus:border-primary focus:outline-hidden"
              />
              <span className="text-[10px] text-muted">Auto-calculates CGST & SGST @ 9%</span>
            </div>

            {/* CGST 9% */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">CGST @ 9% (₹)</label>
              <input
                type="text"
                value={formData.cgst}
                onChange={(e) => handleFieldChange('cgst', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-slate-50 focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* SGST 9% */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">SGST @ 9% (₹)</label>
              <input
                type="text"
                value={formData.sgst}
                onChange={(e) => handleFieldChange('sgst', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-slate-50 focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Round Off */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Round Off (₹)</label>
              <input
                type="text"
                value={formData.roundOff}
                onChange={(e) => handleFieldChange('roundOff', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Invoice Total Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                Gross Invoice Total (₹)
              </label>
              <input
                type="text"
                readOnly
                value={formData.invoiceAmount}
                className="w-full h-8 px-2 text-[12px] font-mono font-bold text-slate-900 border border-slate-200 rounded-lg bg-slate-100"
              />
            </div>

            {/* TDS Deduction */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                TDS Deduction (₹)
              </label>
              <input
                type="text"
                placeholder="e.g. 500.00"
                value={formData.tds}
                onChange={(e) => handleFieldChange('tds', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Cash Shortage Deduction */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Cash Shortage / CBR Deductions (₹)
              </label>
              <input
                type="text"
                placeholder="e.g. 0.00"
                value={formData.cashShortageDeduction}
                onChange={(e) => handleFieldChange('cashShortageDeduction', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Net Amount */}
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                Net Payable / Reconciled (₹)
              </label>
              <input
                type="text"
                readOnly
                value={formData.netAmount}
                className="w-full h-8 px-2 text-[12px] font-mono font-black text-emerald-900 border-2 border-emerald-300 rounded-lg bg-emerald-50"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Compliance & Payment Workflow */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <CheckCircle2 size={16} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-slate-900">
              4. Compliance Workflow & Payment Tracking
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                GST Invoice Status
              </label>
              <select
                value={formData.invoiceStatus}
                onChange={(e) => handleFieldChange('invoiceStatus', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:border-primary focus:outline-hidden"
              >
                {GST_INVOICE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Payment Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => handleFieldChange('paymentStatus', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-800 focus:border-primary focus:outline-hidden"
              >
                {GST_PAYMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Payment Date</label>
              <input
                type="text"
                placeholder="DD-MM-YYYY"
                value={formData.paymentDate}
                onChange={(e) => handleFieldChange('paymentDate', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Bank UTR / Ref Number
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-HDFC-9912048"
                value={formData.utrNumber}
                onChange={(e) => handleFieldChange('utrNumber', e.target.value)}
                className="w-full h-8 px-2 text-[12px] font-mono border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Remarks / Compliance Notes
              </label>
              <input
                type="text"
                placeholder="Any special remarks, e-invoicing IRN number, or audit notes..."
                value={formData.remark}
                onChange={(e) => handleFieldChange('remark', e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Submit Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <Link
            to="/finance/gst/invoice/data"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel & Return
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Eye size={14} />
              <span>Preview Invoice</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-[12px] font-semibold text-white hover:bg-primary-hover shadow-xs transition-colors"
            >
              <Save size={14} />
              <span>{isEditing ? 'Save Changes' : 'Submit GST Invoice Entry'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Invoice Template Modal */}
      {templateModalOpen && (
        <GstInvoiceTemplate
          record={formData}
          onClose={() => setTemplateModalOpen(false)}
        />
      )}
    </div>
  )
}

