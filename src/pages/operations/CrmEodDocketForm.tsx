import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  FileText,
  Search,
  X,
  Paperclip,
  Eye,
  Calendar,
  RotateCcw,
  Mail,
  Save,
  Send,
  ArrowLeft,
  Home,
  CheckCircle2,
} from 'lucide-react'
import {
  useCrmDockets,
  KNOWN_CRM_ATMS,
  type CrmEodDocketRecord,
} from '@/data/eodStore'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'

export default function CrmEodDocketForm() {
  const navigate = useNavigate()
  const { docketId } = useParams()
  const { isReport } = useReportMode()
  const { dockets, addOrUpdateDocket } = useCrmDockets()

  // Find if editing an existing docket
  const existingRecord = useMemoRecord(dockets, docketId)

  // Form State
  const [atmId, setAtmId] = useState(existingRecord?.atmId || 'ABCZ11220')
  const [machine] = useState('CRM')
  const [purpose, setPurpose] = useState<'Routine EOD' | 'Monthly EOD' | 'Cash Audit'>(
    existingRecord?.purpose || 'Routine EOD'
  )
  const [docketNumber, setDocketNumber] = useState(
    existingRecord?.docketNumber || `DEX-EOD-${String(dockets.length + 1).padStart(4, '0')}`
  )
  const [cbrOption, setCbrOption] = useState(existingRecord?.cbrOption || 'Available & Attached')
  const [remark, setRemark] = useState(existingRecord?.remark || 'EOD completed successfully')

  const [franchise, setFranchise] = useState(existingRecord?.franchise || 'Mukesh Singh')
  const [mobileNo, setMobileNo] = useState(existingRecord?.mobileNo || '9719020867')
  const [counterSlipFile, setCounterSlipFile] = useState<string | null>(
    existingRecord?.counterSlipFile || (existingRecord?.counterSlip === 'Uploaded' ? 'Counter_Slip_ABCZ11220.pdf' : null)
  )
  const [eodDate, setEodDate] = useState(
    existingRecord?.eodDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  )
  const [counterFile, setCounterFile] = useState<string | null>(
    existingRecord?.counterFile || 'Counter_Reading_ABCZ11220.jpg'
  )
  const [siteType, setSiteType] = useState<'FFM' | 'SF'>(existingRecord?.siteType || 'FFM')

  // Autocomplete / Searchable ATM ID state
  const [showAtmDropdown, setShowAtmDropdown] = useState(false)
  const [previewDocModal, setPreviewDocModal] = useState(false)

  const counterSlipInputRef = useRef<HTMLInputElement>(null)
  const counterInputRef = useRef<HTMLInputElement>(null)

  // Synchronize when existingRecord changes
  useEffect(() => {
    if (existingRecord) {
      setAtmId(existingRecord.atmId)
      setPurpose(existingRecord.purpose)
      setDocketNumber(existingRecord.docketNumber)
      setCbrOption(existingRecord.cbrOption)
      setRemark(existingRecord.remark)
      setFranchise(existingRecord.franchise)
      setMobileNo(existingRecord.mobileNo)
      setCounterSlipFile(existingRecord.counterSlipFile || null)
      setEodDate(existingRecord.eodDate)
      setCounterFile(existingRecord.counterFile || null)
      setSiteType(existingRecord.siteType)
    }
  }, [existingRecord])

  // Handle ATM ID selection / auto-fill
  const handleSelectAtm = (selectedAtm: string) => {
    setAtmId(selectedAtm)
    setShowAtmDropdown(false)
    const match = KNOWN_CRM_ATMS[selectedAtm]
    if (match) {
      setFranchise(match.franchise)
      setMobileNo(match.mobileNo)
      setSiteType(match.siteType)
      toast(`Fetched details for ATM ${selectedAtm}`)
    }
  }

  // Matching ATM IDs for search
  const filteredAtms = Object.keys(KNOWN_CRM_ATMS).filter((atm) =>
    atm.toLowerCase().includes(atmId.toLowerCase())
  )

  // Actions
  const handleSave = (silent = false) => {
    const record: CrmEodDocketRecord = {
      id: existingRecord?.id || docketNumber,
      atmId,
      docketNumber,
      franchise,
      mobileNo,
      purpose,
      counterSlip: counterSlipFile ? 'Uploaded' : 'Pending',
      counterSlipFile: counterSlipFile || undefined,
      eodDate,
      remark,
      machine: 'CRM',
      cbrOption,
      counterFile: counterFile || undefined,
      siteType,
      status: 'Saved',
    }
    addOrUpdateDocket(record)
    if (!silent) toast(`Docket ${docketNumber} saved as draft`)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!atmId.trim()) return toast('Please enter or select an ATM ID', 'info')
    if (!docketNumber.trim()) return toast('Please provide a Docket Number', 'info')

    const record: CrmEodDocketRecord = {
      id: existingRecord?.id || docketNumber,
      atmId,
      docketNumber,
      franchise,
      mobileNo,
      purpose,
      counterSlip: counterSlipFile ? 'Uploaded' : 'Pending',
      counterSlipFile: counterSlipFile || undefined,
      eodDate,
      remark,
      machine: 'CRM',
      cbrOption,
      counterFile: counterFile || undefined,
      siteType,
      status: 'Submitted',
    }
    addOrUpdateDocket(record)
    toast(`CRM EOD Request for Docket ${docketNumber} submitted successfully!`)
    navigate('/operations/eod/crm')
  }

  const handleCancelEod = () => {
    if (window.confirm('Are you sure you want to cancel this EOD request?')) {
      const record: CrmEodDocketRecord = {
        id: existingRecord?.id || docketNumber,
        atmId,
        docketNumber,
        franchise,
        mobileNo,
        purpose,
        counterSlip: counterSlipFile ? 'Uploaded' : 'Pending',
        counterSlipFile: counterSlipFile || undefined,
        eodDate,
        remark: `${remark} [Cancelled on ${new Date().toLocaleDateString('en-GB')}]`,
        machine: 'CRM',
        cbrOption,
        counterFile: counterFile || undefined,
        siteType,
        status: 'Cancelled',
      }
      addOrUpdateDocket(record)
      toast(`Docket ${docketNumber} marked as Cancelled`)
      navigate('/operations/eod/crm')
    }
  }

  const handleReject = () => {
    if (window.confirm('Are you sure you want to reject this request?')) {
      const record: CrmEodDocketRecord = {
        id: existingRecord?.id || docketNumber,
        atmId,
        docketNumber,
        franchise,
        mobileNo,
        purpose,
        counterSlip: counterSlipFile ? 'Uploaded' : 'Pending',
        counterSlipFile: counterSlipFile || undefined,
        eodDate,
        remark: `${remark} [Rejected by Operations]`,
        machine: 'CRM',
        cbrOption,
        counterFile: counterFile || undefined,
        siteType,
        status: 'Rejected',
      }
      addOrUpdateDocket(record)
      toast(`Docket ${docketNumber} rejected`)
      navigate('/operations/eod/crm')
    }
  }

  const handleEmail = () => {
    toast(`Email notification dispatched for Docket ${docketNumber} to ${franchise} (${mobileNo})`)
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-4">
      {/* ── Breadcrumb matching Image 02 (Workspace > Operations > EOD > CRM EOD Request) ── */}
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
        <Link to="/operations/eod" className="hover:text-[#0066FF] transition-colors">
          EOD
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <Link to="/operations/eod/crm" className="hover:text-[#0066FF] transition-colors">
          CRM EOD Request
        </Link>
      </div>

      {/* ── Header Title matching Image 02 ── */}
      <div className="flex items-center gap-3 pt-0.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0066FF] text-white shadow-md shadow-blue-500/20">
          <FileText size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            CRM EOD Request for Docket Number
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Raise and manage CRM EOD requests for the selected ATM with complete details.
          </p>
        </div>
      </div>

      {/* ── Form Card: EOD Request Details ── */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {/* Card Header with blue document icon */}
        <div className="px-6 py-3.5 border-b border-[#E2E8F0] bg-slate-50/50 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066FF] text-white">
            <FileText size={15} />
          </div>
          <h2 className="text-[14.5px] font-bold text-[#1E293B]">
            EOD Request Details
          </h2>
        </div>

        {/* 2-Column Form Fields matching Image 02 */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4.5">
          {/* ================= LEFT COLUMN ================= */}
          <div className="space-y-4.5">
            {/* ATM ID * with Searchable badge */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-bold text-slate-700">
                  ATM ID <span className="text-rose-500">*</span>
                </label>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                  Searchable
                </span>
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={atmId}
                  onChange={(e) => {
                    setAtmId(e.target.value)
                    setShowAtmDropdown(true)
                  }}
                  onFocus={() => setShowAtmDropdown(true)}
                  placeholder="Search ATM ID (e.g. ABCZ11220)"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-[13px] text-slate-800 font-medium focus:border-[#0066FF] focus:outline-hidden"
                />
                {atmId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAtmId('')
                      setShowAtmDropdown(true)
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showAtmDropdown && filteredAtms.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto scroll-thin rounded-xl border border-slate-200 bg-white shadow-xl z-30">
                  {filteredAtms.map((atm) => {
                    const info = KNOWN_CRM_ATMS[atm]
                    return (
                      <div
                        key={atm}
                        onClick={() => handleSelectAtm(atm)}
                        className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 text-[12px] flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-slate-800">{atm}</strong>
                          <span className="text-slate-500 ml-2">({info.franchise})</span>
                        </div>
                        <span className="text-[10.5px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {info.siteType}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Machine */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Machine
              </label>
              <input
                type="text"
                value={machine}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-[13px] font-semibold text-slate-700 focus:outline-hidden cursor-not-allowed"
              />
            </div>

            {/* Purpose * */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Purpose <span className="text-rose-500">*</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden cursor-pointer"
              >
                <option value="Select Purpose">Select Purpose</option>
                <option value="Routine EOD">Routine EOD</option>
                <option value="Monthly EOD">Monthly EOD</option>
                <option value="Cash Audit">Cash Audit</option>
              </select>
            </div>

            {/* Docket Number */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Docket Number
              </label>
              <input
                type="text"
                value={docketNumber}
                onChange={(e) => setDocketNumber(e.target.value)}
                placeholder="Enter Docket Number"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
              />
            </div>

            {/* CBR - For Physical Cash Summary */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                CBR - For Physical Cash Summary
              </label>
              <select
                value={cbrOption}
                onChange={(e) => setCbrOption(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden cursor-pointer"
              >
                <option value="Select Option">Select Option</option>
                <option value="Available & Attached">Available & Attached</option>
                <option value="Pending Physical Verification">Pending Physical Verification</option>
                <option value="Reconciled with Switch Count">Reconciled with Switch Count</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>

            {/* Remark with character counter */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Remark
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Enter Remark (if any)"
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 pb-6 text-[12.5px] text-slate-800 focus:border-[#0066FF] focus:outline-hidden resize-none"
                />
                <span className="absolute right-3 bottom-2 text-[10.5px] font-medium text-slate-400">
                  {remark.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="space-y-4.5">
            {/* Franchise */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Franchise
              </label>
              <input
                type="text"
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 px-3 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
              />
            </div>

            {/* Mobile No. */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Mobile No.
              </label>
              <input
                type="text"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 px-3 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
              />
            </div>

            {/* Counter Slip * (File Upload) */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Counter Slip <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={counterSlipInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setCounterSlipFile(f.name)
                      toast(`Attached Counter Slip: ${f.name}`)
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => counterSlipInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-sky-50 hover:bg-sky-100 text-[#0066FF] px-3.5 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  <Paperclip size={13} />
                  <span>Choose Files</span>
                </button>
                <span className="text-[12px] text-slate-500 truncate max-w-xs">
                  {counterSlipFile || 'No file chosen'}
                </span>
              </div>
            </div>

            {/* View Counter Slip Button */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                View Counter Slip
              </label>
              <button
                type="button"
                onClick={() => {
                  if (counterSlipFile) setPreviewDocModal(true)
                  else toast('No counter slip uploaded yet. Please choose a file first.', 'info')
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0066FF] bg-white hover:bg-blue-50 text-[#0066FF] px-3.5 py-1.5 text-[12px] font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Eye size={14} />
                <span>View Uploaded File</span>
              </button>
            </div>

            {/* EOD Date */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                EOD Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={eodDate}
                  onChange={(e) => setEodDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden"
                />
                <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Counter * (File Upload) */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Counter <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={counterInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setCounterFile(f.name)
                      toast(`Attached Counter Reading: ${f.name}`)
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => counterInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-sky-50 hover:bg-sky-100 text-[#0066FF] px-3.5 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  <Paperclip size={13} />
                  <span>Choose Files</span>
                </button>
                <span className="text-[12px] text-slate-500 truncate max-w-xs">
                  {counterFile || 'No file chosen'}
                </span>
              </div>
            </div>

            {/* Site Type * */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Site Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value as 'FFM' | 'SF')}
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-[13px] font-medium text-slate-800 focus:border-[#0066FF] focus:outline-hidden cursor-pointer"
              >
                <option value="Select Site Type">Select Site Type</option>
                <option value="FFM">FFM</option>
                <option value="SF">SF</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Bottom Action Bar matching Image 02 ── */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex flex-wrap items-center justify-between gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(isReport ? '/operations/eod/crm?source=report' : '/operations/eod/crm')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-[12.5px] font-semibold text-slate-700 shadow-xs cursor-pointer transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          {/* Right Action Buttons */}
          {!isReport && (
            <div className="flex flex-wrap items-center gap-2">
              {/* EOD Cancel */}
              <button
                type="button"
                onClick={handleCancelEod}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 px-3.5 py-2 text-[12.5px] font-semibold text-rose-600 shadow-xs cursor-pointer transition-colors"
              >
                <RotateCcw size={14} className="text-rose-500" />
                <span>EOD Cancel</span>
              </button>

              {/* Reject Request */}
              <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 px-3.5 py-2 text-[12.5px] font-semibold text-rose-600 shadow-xs cursor-pointer transition-colors"
              >
                <X size={14} className="text-rose-500" />
                <span>Reject Request</span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={handleEmail}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-3.5 py-2 text-[12.5px] font-semibold text-[#0066FF] shadow-xs cursor-pointer transition-colors"
              >
                <Mail size={14} />
                <span>Email</span>
              </button>

              {/* Save */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-3.5 py-2 text-[12.5px] font-semibold text-[#0066FF] shadow-xs cursor-pointer transition-colors"
              >
                <Save size={14} />
                <span>Save</span>
              </button>

              {/* Submit */}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] px-5 py-2 text-[12.5px] font-bold text-white shadow-sm cursor-pointer transition-colors"
              >
                <Send size={14} />
                <span>Submit</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* ── Document Preview Modal ── */}
      {previewDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-[#0066FF]" />
                <h3 className="text-[14px] font-bold text-slate-800">
                  Document Preview: {counterSlipFile}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-[12.5px] flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-800">Verified Counter Slip Document</div>
                  <div className="text-emerald-600 text-[11.5px] mt-0.5">
                    Uploaded on {eodDate} for ATM {atmId}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] space-y-1.5 text-slate-600">
                <p><strong>Docket:</strong> {docketNumber}</p>
                <p><strong>Franchise:</strong> {franchise}</p>
                <p><strong>File Name:</strong> {counterSlipFile}</p>
                <p><strong>File Size:</strong> 248 KB · PDF Document</p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-3 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setPreviewDocModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function useMemoRecord(dockets: CrmEodDocketRecord[], id?: string) {
  if (!id || id === 'new') return null
  return dockets.find((d) => d.docketNumber === id || d.id === id) || null
}

