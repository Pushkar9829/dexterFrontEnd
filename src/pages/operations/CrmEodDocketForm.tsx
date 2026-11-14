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
  Banknote,
  FileSpreadsheet,
  Info,
  Edit2,
} from 'lucide-react'
import {
  useCrmDockets,
  KNOWN_CRM_ATMS,
  type CrmEodDocketRecord,
} from '@/data/eodStore'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'

const CBR_PARTICULARS = [
  { key: 'opening', label: 'Opening Balance', info: 'Cash balance available at the beginning of the replenishment cycle' },
  { key: 'dispensed', label: 'Cash Dispensed', info: 'Total amount dispensed by the ATM since last reconciliation' },
  { key: 'purge', label: 'Cash in Purge Bin', info: 'Notes diverted to purge/reject bin due to pick/sensor errors' },
  { key: 'cassettes', label: 'Cash in Cassettes', info: 'Current physical currency residing inside currency cassettes' },
  { key: 'physical', label: 'Physical Cash Before Replenishment', info: 'Actual physical count verified in the ATM before adding fresh notes' },
  { key: 'overage', label: 'Overage', info: 'Excess cash detected beyond system switch records' },
  { key: 'shortage', label: 'Shortage', info: 'Deficit cash detected compared to system switch records' },
  { key: 'replenishment', label: 'Cash Replenishment', info: 'Fresh currency loaded during the current cycle' },
  { key: 'closing', label: 'Closing Balance', info: 'Final verified balance following replenishment' },
  { key: 'switch', label: 'Switch Counter', info: 'Terminal electronic balance recorded by the host switch' },
]

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

  // CBR - Physical Cash Summary Modal State
  const [cbrModalOpen, setCbrModalOpen] = useState(false)
  const [cbrData, setCbrData] = useState<{
    matrix: Record<string, (string | number)[]>
    remarks: string
    physicalTotal?: number
    replenishTotal?: number
    dispensedTotal?: number
    closingTotal?: number
    submittedAt?: string
  } | null>(existingRecord?.cbrData || null)

  const [cbrMatrix, setCbrMatrix] = useState<Record<string, (string | number)[]>>(() => {
    return (
      existingRecord?.cbrData?.matrix || {
        opening: ['', '', '', ''],
        dispensed: ['', '', '', ''],
        purge: ['', '', '', ''],
        cassettes: ['', '', '', ''],
        physical: ['', '', '', ''],
        overage: ['', '', '', ''],
        shortage: ['', '', '', ''],
        replenishment: ['', '', '', ''],
        closing: ['', '', '', ''],
        switch: ['', '', '', ''],
      }
    )
  })
  const [cbrRemarks, setCbrRemarks] = useState(existingRecord?.cbrData?.remarks || '')

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
      if (existingRecord.cbrData) {
        setCbrData(existingRecord.cbrData)
        if (existingRecord.cbrData.matrix) setCbrMatrix(existingRecord.cbrData.matrix)
        if (existingRecord.cbrData.remarks) setCbrRemarks(existingRecord.cbrData.remarks)
      }
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

  // CBR Modal handlers
  const handleCbrCellChange = (key: string, colIndex: number, value: string) => {
    setCbrMatrix((prev) => {
      const current = prev[key] ? [...prev[key]] : ['', '', '', '']
      current[colIndex] = value
      return { ...prev, [key]: current }
    })
  }

  const calcCbrRowTotal = (key: string, mat = cbrMatrix) => {
    const row = mat[key] || ['', '', '', '']
    const q200 = Number(row[0]) || 0
    const q100 = Number(row[1]) || 0
    const q500 = Number(row[2]) || 0
    const q2000 = Number(row[3]) || 0
    return q200 * 200 + q100 * 100 + q500 * 500 + q2000 * 2000
  }

  const handleCbrModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const physicalTotal = calcCbrRowTotal('physical')
    const replenishTotal = calcCbrRowTotal('replenishment')
    const dispensedTotal = calcCbrRowTotal('dispensed')
    const closingTotal = calcCbrRowTotal('closing')

    const summaryPayload = {
      matrix: cbrMatrix,
      remarks: cbrRemarks,
      physicalTotal,
      replenishTotal,
      dispensedTotal,
      closingTotal,
      submittedAt: new Date().toISOString(),
    }
    setCbrData(summaryPayload)

    // Update the field cbrOption
    const updatedOption =
      physicalTotal > 0 || replenishTotal > 0
        ? `Available & Attached (Physical: ₹${physicalTotal.toLocaleString('en-IN')}${
            replenishTotal > 0 ? ` | Replenished: ₹${replenishTotal.toLocaleString('en-IN')}` : ''
          })`
        : 'Available & Attached (CBR Physical Summary Verified)'

    setCbrOption(updatedOption)

    // If CBR remark is provided and general remark is default, append or note it
    if (cbrRemarks.trim() && (!remark || remark === 'EOD completed successfully')) {
      setRemark(`EOD completed successfully - CBR: ${cbrRemarks.trim()}`)
    }

    setCbrModalOpen(false)
    toast('CBR - Physical Cash Summary updated successfully!', 'success')
  }

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
      cbrData: cbrData || undefined,
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
      cbrData: cbrData || undefined,
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
        cbrData: cbrData || undefined,
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
        cbrData: cbrData || undefined,
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Banknote size={14} className="text-[#0066FF]" />
                  <span>CBR - For Physical Cash Summary</span>
                </label>
                {cbrData ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={11} /> Recorded
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCbrModalOpen(true)}
                    className="text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Open CBR Form</span>
                  </button>
                )}
              </div>

              {/* Clickable Card that opens the CBR Pop-up Form */}
              <div
                onClick={() => setCbrModalOpen(true)}
                className={cn(
                  'w-full rounded-xl border py-2 px-3 flex items-center justify-between transition-all cursor-pointer group shadow-2xs',
                  cbrData
                    ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-400'
                    : 'border-slate-200 bg-white hover:border-[#0066FF] hover:bg-blue-50/20'
                )}
                title="Click to open CBR - For Physical Cash Summary form"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileSpreadsheet
                    size={16}
                    className={cn(
                      'shrink-0',
                      cbrData ? 'text-emerald-600' : 'text-[#0066FF]'
                    )}
                  />
                  <div className="truncate">
                    <div className="text-[13px] font-semibold text-slate-800 truncate">
                      {cbrOption || 'Available & Attached'}
                    </div>
                    {cbrData && (
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Physical: ₹{(cbrData.physicalTotal || 0).toLocaleString('en-IN')} · Replenished: ₹{(cbrData.replenishTotal || 0).toLocaleString('en-IN')}
                        {cbrData.remarks ? ` · ${cbrData.remarks}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1',
                      cbrData
                        ? 'bg-white text-emerald-700 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'
                        : 'bg-[#0066FF] text-white border-[#0066FF] group-hover:bg-[#0052CC]'
                    )}
                  >
                    {cbrData ? (
                      <>
                        <Edit2 size={11} />
                        <span>Edit CBR</span>
                      </>
                    ) : (
                      <>
                        <span>Fill CBR</span>
                        <ChevronRight size={11} />
                      </>
                    )}
                  </span>
                </div>
              </div>
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

      {/* ── CBR - Physical Cash Summary Modal (Cash & Transaction Details + Remarks only) ── */}
      {cbrModalOpen && (
        <Modal
          title="CBR - For Physical Cash Summary"
          sub={`Daily ATM Cash Loading / Replenishment / CBR · ATM: ${atmId || 'CRM Terminal'} · Date: ${eodDate}`}
          width={960}
          onClose={() => setCbrModalOpen(false)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3 text-[12px] text-slate-600 font-medium">
                <span>
                  Physical Cash: <strong className="text-emerald-700">₹{calcCbrRowTotal('physical').toLocaleString('en-IN')}</strong>
                </span>
                <span>•</span>
                <span>
                  Replenished: <strong className="text-[#0066FF]">₹{calcCbrRowTotal('replenishment').toLocaleString('en-IN')}</strong>
                </span>
                <span>•</span>
                <span>
                  Closing: <strong className="text-slate-800">₹{calcCbrRowTotal('closing').toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCbrModalOpen(false)}
                  className="px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCbrModalSubmit}
                  className="px-5 py-2 text-[12.5px] font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>Submit CBR Summary</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Top metadata alert matching CBR format */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                  <Banknote size={17} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Cash &amp; Transaction Details</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    Physical count of currency denominations for Daily CBR verification
                  </div>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500 hidden sm:block">
                <div>ATM ID: <span className="font-bold text-slate-800">{atmId}</span></div>
                <div>EOD Date: <span className="font-bold text-slate-800">{eodDate}</span></div>
              </div>
            </div>

            {/* Section 1: Cash & Transaction Details Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto scroll-thin max-h-[380px]">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-blue-100 bg-[#EAF2FD] text-[11.5px] font-bold text-slate-800">
                      <th className="py-2.5 px-3 w-[260px] border-r border-blue-100/60 bg-[#EAF2FD]">
                        Particular
                      </th>
                      <th className="py-2.5 px-2.5 text-center min-w-[125px] border-r border-blue-100/60 bg-[#EAF2FD]">
                        <div>Type 1 - 200</div>
                        <div className="text-[10.5px] font-medium text-slate-600">(₹200)</div>
                      </th>
                      <th className="py-2.5 px-2.5 text-center min-w-[125px] border-r border-blue-100/60 bg-[#EAF2FD]">
                        <div>Type 2 - 100</div>
                        <div className="text-[10.5px] font-medium text-slate-600">(₹100)</div>
                      </th>
                      <th className="py-2.5 px-2.5 text-center min-w-[125px] border-r border-blue-100/60 bg-[#EAF2FD]">
                        <div>Type 3 - 500</div>
                        <div className="text-[10.5px] font-medium text-slate-600">(₹500)</div>
                      </th>
                      <th className="py-2.5 px-2.5 text-center min-w-[125px] border-r border-blue-100/60 bg-[#EAF2FD]">
                        <div>Type 4 - 2000</div>
                        <div className="text-[10.5px] font-medium text-slate-600">(₹2,000)</div>
                      </th>
                      <th className="py-2.5 px-3 text-center w-[120px] bg-[#EAF2FD]">
                        Total (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {CBR_PARTICULARS.map((p) => {
                      const values = cbrMatrix[p.key] || ['', '', '', '']
                      const rowTotal = calcCbrRowTotal(p.key)
                      const isOpening = p.key === 'opening'
                      const isPhysical = p.key === 'physical'
                      const isReplenish = p.key === 'replenishment'

                      return (
                        <tr
                          key={p.key}
                          className={cn(
                            'hover:bg-slate-50/70 transition-colors',
                            isPhysical && 'bg-emerald-50/30 font-medium',
                            isReplenish && 'bg-blue-50/30 font-medium'
                          )}
                        >
                          <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap border-r border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(isPhysical && 'font-bold text-emerald-800', isReplenish && 'font-bold text-[#0066FF]')}>
                                {p.label}
                              </span>
                              <span title={p.info} className="cursor-help">
                                <Info size={12} className="text-[#0066FF] shrink-0" />
                              </span>
                            </div>
                          </td>

                          {[0, 1, 2, 3].map((colIdx) => (
                            <td key={colIdx} className="py-1.5 px-2 text-center border-r border-slate-100">
                              <input
                                type="number"
                                min="0"
                                placeholder={isOpening ? '--' : '0'}
                                value={values[colIdx]}
                                onChange={(e) => handleCbrCellChange(p.key, colIdx, e.target.value)}
                                className="w-full h-7.5 px-2 text-center text-[12px] font-medium text-slate-800 rounded-md border border-slate-200 bg-white hover:border-slate-300 focus:border-[#0066FF] outline-none shadow-2xs"
                              />
                            </td>
                          ))}

                          <td className={cn('py-2 px-3 text-center font-bold text-slate-800', isPhysical && 'text-emerald-700', isReplenish && 'text-[#0066FF]')}>
                            ₹{rowTotal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Live Summary Footer Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border-t border-slate-200">
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10.5px] font-semibold text-slate-500 uppercase">Physical Cash</div>
                  <div className="text-[13.5px] font-bold text-emerald-600 mt-0.5">
                    ₹{calcCbrRowTotal('physical').toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10.5px] font-semibold text-slate-500 uppercase">Cash Replenished</div>
                  <div className="text-[13.5px] font-bold text-[#0066FF] mt-0.5">
                    ₹{calcCbrRowTotal('replenishment').toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10.5px] font-semibold text-slate-500 uppercase">Cash Dispensed</div>
                  <div className="text-[13.5px] font-bold text-slate-700 mt-0.5">
                    ₹{calcCbrRowTotal('dispensed').toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10.5px] font-semibold text-slate-500 uppercase">Closing Balance</div>
                  <div className="text-[13.5px] font-bold text-slate-700 mt-0.5">
                    ₹{calcCbrRowTotal('closing').toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Remarks */}
            <div className="rounded-xl border border-slate-200 p-3.5 bg-white shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={15} className="text-[#0066FF]" />
                <label className="text-[12.5px] font-bold text-slate-800">
                  Remarks
                </label>
              </div>
              <textarea
                rows={2}
                value={cbrRemarks}
                onChange={(e) => setCbrRemarks(e.target.value)}
                placeholder="Enter remarks (if any) for physical cash / replenishment count..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] outline-none resize-none shadow-2xs"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function useMemoRecord(dockets: CrmEodDocketRecord[], id?: string) {
  if (!id || id === 'new') return null
  return dockets.find((d) => d.docketNumber === id || d.id === id) || null
}

