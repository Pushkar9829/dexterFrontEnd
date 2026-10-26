import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  FileText,
  User,
  Phone,
  MapPin,
  Hash,
  Calendar,
  Landmark,
  Save,
  Receipt,
  Calculator,
  ListFilter,
  Sparkles,
  CreditCard,
  IndianRupee,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  FIN_YEARS,
  FY_MONTHS,
  GST_INVOICE_STATUSES,
  GST_PAYMENT_STATUSES,
  calcNet,
  emptyGst,
  getGst,
  saveGst,
  type GstRecord,
  type GstInvoiceStatus,
  type GstPaymentStatus,
} from '@/data/financeGst'
import { SITES, FRANCHISEES } from '@/data/cbrSites'

export default function GstRecordPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [record, setRecord] = useState<GstRecord>(() => {
    if (!isNew && id) {
      const found = getGst(id)
      if (found) return JSON.parse(JSON.stringify(found))
    }
    return emptyGst('26-27')
  })

  useEffect(() => {
    if (!isNew && id) {
      const found = getGst(id)
      if (found) {
        setRecord(JSON.parse(JSON.stringify(found)))
      }
    }
  }, [id, isNew])

  // Lists for Dropdowns
  const atmOptions = useMemo(
    () => Array.from(new Set(SITES.map((s) => s.atmId).filter(Boolean))).sort(),
    []
  )
  const siteOptions = useMemo(
    () => Array.from(new Set(SITES.map((s) => s.siteId).filter(Boolean))).sort(),
    []
  )

  // Auto-fill details when ATM ID is chosen
  const handleAtmChange = (atmId: string) => {
    const matchedSite = SITES.find((s) => s.atmId === atmId)
    if (matchedSite) {
      const fr = FRANCHISEES.find((f) => f.id === matchedSite.franchiseId)
      setRecord((prev) => ({
        ...prev,
        atmId,
        siteId: matchedSite.siteId,
        locationName: `${matchedSite.location}, ${matchedSite.city}`,
        franchiseeName: fr?.name || prev.franchiseeName,
        contactNo: fr?.contact || prev.contactNo,
        gstNumber: fr?.gstin || prev.gstNumber,
        sapCode: fr?.sapCode || prev.sapCode,
      }))
      toast(`Loaded details for ATM ${atmId}`)
    } else {
      setRecord((prev) => ({ ...prev, atmId }))
    }
  }

  // Auto-fill details when Site ID is chosen
  const handleSiteChange = (siteId: string) => {
    const matchedSite = SITES.find((s) => s.siteId === siteId)
    if (matchedSite) {
      const fr = FRANCHISEES.find((f) => f.id === matchedSite.franchiseId)
      setRecord((prev) => ({
        ...prev,
        siteId,
        atmId: matchedSite.atmId,
        locationName: `${matchedSite.location}, ${matchedSite.city}`,
        franchiseeName: fr?.name || prev.franchiseeName,
        contactNo: fr?.contact || prev.contactNo,
        gstNumber: fr?.gstin || prev.gstNumber,
        sapCode: fr?.sapCode || prev.sapCode,
      }))
      toast(`Loaded details for Site ${siteId}`)
    } else {
      setRecord((prev) => ({ ...prev, siteId }))
    }
  }

  const updateField = <K extends keyof GstRecord>(key: K, value: GstRecord[K]) => {
    setRecord((prev) => ({ ...prev, [key]: value }))
  }

  // Auto calculate net amount helper
  const handleAutoCalcNet = () => {
    const net = calcNet(record)
    setRecord((prev) => ({ ...prev, netAmount: String(net) }))
    toast(`Net Amount calculated: ₹${net.toLocaleString('en-IN')}`, 'info')
  }

  // Summary calculations
  const grossInv = Number(record.invoiceAmount) || 0
  const totalDeductions =
    (Number(record.tds) || 0) +
    (Number(record.cashShortageDeduction) || 0) +
    (Number(record.disputeDeduction) || 0) +
    (Number(record.chargebackDeduction) || 0) +
    (Number(record.gstRelatedDeduction) || 0)
  const calcNetValue = Math.max(0, grossInv - totalDeductions)

  const handleSave = (isDraft = false) => {
    if (!isDraft) {
      if (!record.atmId && !record.siteId) {
        toast('Please enter or select an ATM ID or Site ID', 'info')
        return
      }
      if (!record.invoiceNumber && !record.invoiceAmount) {
        toast('Please enter Invoice Number or Invoice Amount', 'info')
        return
      }
    }

    const payload: GstRecord = {
      ...record,
      gstNumber: record.gstNumber.trim().toUpperCase(),
      utrNumber: record.utrNumber.trim().toUpperCase(),
      netAmount: record.netAmount || String(calcNetValue),
    }

    const saved = saveGst(payload)
    toast(
      isDraft
        ? `GST draft saved successfully`
        : isNew
          ? `GST record ${saved.id} created successfully`
          : `GST record ${saved.id} updated successfully`
    )
    navigate('/finance/gst')
  }

  return (
    <div className="space-y-4 pb-16 max-w-6xl mx-auto">
      {/* Breadcrumb: [Workspace] > [Finance] > GST Data > new */}
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
        <Link to="/finance/gst" className="hover:text-[#0066FF] transition-colors">
          GST
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isNew ? 'new' : record.id || id}
        </span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Receipt size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
                {isNew ? 'New GST Record' : `GST Record · ${record.id || id}`}
              </h1>
              {!isNew && record.paymentStatus && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${record.paymentStatus === 'Done'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                >
                  {record.paymentStatus}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Franchise GST invoice declarations, tax withholding deductions, and payout settlement.
            </p>
          </div>
        </div>

        {!isNew && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              S.N. #{record.sn || 1}
            </span>
          </div>
        )}
      </div>

      {/* CARD 1: Identity & Reporting Period */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              1. Identity &amp; Reporting Period
            </h2>
          </div>
          {record.id && (
            <span className="text-[11px] font-semibold text-[#0066FF] bg-white px-2 py-0.5 rounded border border-[#0066FF]/20 font-mono">
              {record.id}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ATM ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.atmId || ''}
                  onChange={(e) => handleAtmChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select ATM ID</option>
                  {atmOptions.map((atm) => (
                    <option key={atm} value={atm}>
                      {atm}
                    </option>
                  ))}
                  {record.atmId && !atmOptions.includes(record.atmId) && (
                    <option value={record.atmId}>{record.atmId}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Site ID * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Site ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.siteId || ''}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select Site ID</option>
                  {siteOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {record.siteId && !siteOptions.includes(record.siteId) && (
                    <option value={record.siteId}>{record.siteId}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* SAP Code */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                SAP Code
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.sapCode || ''}
                  onChange={(e) => updateField('sapCode', e.target.value)}
                  placeholder="e.g. 410124"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Financial Year * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Financial Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.fYear || '26-27'}
                  onChange={(e) => updateField('fYear', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  {FIN_YEARS.map((fy) => (
                    <option key={fy} value={fy}>
                      FY {fy}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Month * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Month <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.month || 'September'}
                  onChange={(e) => updateField('month', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select Month</option>
                  {FY_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* S.N. Sequence */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                S.N. Sequence
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  readOnly
                  value={record.sn ? `Sequence #${record.sn}` : 'System Assigned on Save'}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Franchise & Invoice Details */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Receipt size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            2. Franchise &amp; Invoice Details
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Franchisee Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Franchisee Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.franchiseeName || ''}
                  onChange={(e) => updateField('franchiseeName', e.target.value)}
                  placeholder="Enter Franchisee Name"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Contact No. */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Contact No.
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.contactNo || ''}
                  onChange={(e) => updateField('contactNo', e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Location Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Location Name
              </label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.locationName || ''}
                  onChange={(e) => updateField('locationName', e.target.value)}
                  placeholder="e.g. Kothrud, Pune"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* GSTIN */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GSTIN (GST Number)
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.gstNumber || ''}
                  onChange={(e) => updateField('gstNumber', e.target.value.toUpperCase())}
                  placeholder="15-char GSTIN"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono uppercase"
                />
              </div>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Invoice Number
              </label>
              <div className="relative">
                <FileText
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.invoiceNumber || ''}
                  onChange={(e) => updateField('invoiceNumber', e.target.value)}
                  placeholder="e.g. SSFS/26-27/001"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Invoice Amount * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Invoice Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="number"
                  value={record.invoiceAmount || ''}
                  onChange={(e) => updateField('invoiceAmount', e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Invoice Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GST Invoice Status
              </label>
              <div className="relative">
                <ListFilter
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.invoiceStatus || ''}
                  onChange={(e) =>
                    updateField('invoiceStatus', e.target.value as GstInvoiceStatus | '')
                  }
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all truncate"
                >
                  <option value="">Select Invoice Status</option>
                  {GST_INVOICE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Deductions & Net Amount */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-[#0066FF]" />
            <h2 className="text-[14px] font-bold text-[#0066FF]">
              3. Deductions &amp; Net Amount
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAutoCalcNet}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-[#0066FF] bg-white hover:bg-blue-50 border border-[#0066FF]/30 rounded-md transition-colors shadow-xs"
          >
            <Sparkles size={13} className="text-[#0066FF]" />
            Auto Calculate Net
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* TDS */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                TDS (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={record.tds || ''}
                  onChange={(e) => updateField('tds', e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Cash Shortage Deduction */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cash Shortage (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={record.cashShortageDeduction || ''}
                  onChange={(e) => updateField('cashShortageDeduction', e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Dispute Deduction */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dispute Deduction (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={record.disputeDeduction || ''}
                  onChange={(e) => updateField('disputeDeduction', e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Chargeback Deduction */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Chargeback (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={record.chargebackDeduction || ''}
                  onChange={(e) => updateField('chargebackDeduction', e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* GST Related Deduction */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GST Deduction (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={record.gstRelatedDeduction || ''}
                  onChange={(e) => updateField('gstRelatedDeduction', e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* Net Amount * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                Net Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={record.netAmount !== '' ? record.netAmount : calcNetValue || ''}
                  onChange={(e) => updateField('netAmount', e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-3 text-[12px] font-bold rounded-lg border-2 border-[#0066FF] bg-blue-50/20 text-[#0066FF] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[12px]">
            <div className="flex items-center gap-6 text-slate-600 font-medium">
              <span>
                Gross Invoice: <strong className="text-slate-900 font-semibold">₹{grossInv.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Total Deductions: <strong className="text-rose-600 font-semibold">₹{totalDeductions.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Suggested Net:</span>
              <span className="font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                ₹{calcNetValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: Payment Settlement & Status */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <div className="bg-[#EAF3FD] px-4 py-3 border-b border-[#D5E5F8] flex items-center gap-2">
          <Landmark size={18} className="text-[#0066FF]" />
          <h2 className="text-[14px] font-bold text-[#0066FF]">
            4. Payment Settlement &amp; Status
          </h2>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* GST Payment Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GST Payment Status
              </label>
              <div className="relative">
                <ListFilter
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <select
                  value={record.paymentStatus || ''}
                  onChange={(e) =>
                    updateField('paymentStatus', e.target.value as GstPaymentStatus | '')
                  }
                  className="w-full h-8.5 pl-8 pr-7 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 appearance-none transition-all"
                >
                  <option value="">Select Payment Status</option>
                  {GST_PAYMENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Paid Amount (₹) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Paid Amount (₹)
              </label>
              <div className="relative">
                <IndianRupee
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="number"
                  value={record.paidAmount || ''}
                  onChange={(e) => updateField('paidAmount', e.target.value)}
                  placeholder="e.g. 44100"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Date
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="date"
                  value={record.paymentDate || ''}
                  onChange={(e) => updateField('paymentDate', e.target.value)}
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
                />
              </div>
            </div>

            {/* UTR Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                UTR Number
              </label>
              <div className="relative">
                <Hash
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0066FF] pointer-events-none"
                />
                <input
                  type="text"
                  value={record.utrNumber || ''}
                  onChange={(e) => updateField('utrNumber', e.target.value.toUpperCase())}
                  placeholder="12–22 char UTR"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={record.remark || ''}
              onChange={(e) => updateField('remark', e.target.value)}
              placeholder="e.g. GST invoice verified against GSTR-2B"
              className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50/60 text-[#0066FF] text-[12.5px] font-semibold transition-all shadow-xs"
          >
            <Save size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 h-9.5 px-6 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12.5px] font-semibold transition-all shadow-sm"
          >
            <span>Save GST Record</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
