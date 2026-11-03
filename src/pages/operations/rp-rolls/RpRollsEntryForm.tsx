import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  FileUp,
  Home,
  MapPin,
  PackageCheck,
  Paperclip,
  RotateCcw,
  Save,
  Search,
  Send,
  X,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { RpRollsIcon } from '@/components/icons/RpRollsIcon'
import {
  KNOWN_ATMS,
  STATES_LIST,
  COURIER_LIST,
  HUB_LOCATIONS_LIST,
  addRpRollRecord,
  getStoredDraft,
  saveStoredDraft,
  clearStoredDraft,
  type RpRollRecord,
} from '@/data/rpRolls'

export default function RpRollsEntryForm() {
  const navigate = useNavigate()
  const initialDraft = getStoredDraft()

  // Card 1: Site & Franchise Details
  const [atmId, setAtmId] = useState(initialDraft?.atmId || 'MCRM0389')
  const [siteId, setSiteId] = useState(initialDraft?.siteId || 'MCRM1943')
  const [franchiseeName, setFranchiseeName] = useState(initialDraft?.franchiseeName || 'Siddhant Shakya')
  const [frName, setFrName] = useState(initialDraft?.frName || 'Dexter India Management & Services Pvt. Ltd.')
  const [frNumber, setFrNumber] = useState(initialDraft?.frNumber || '8755555003')

  // Card 2: Location / Address Details
  const [hubLocations, setHubLocations] = useState(initialDraft?.hubLocations || 'MAINPURI - MCRM1943')
  const [frAddressWithPin, setFrAddressWithPin] = useState(
    initialDraft?.frAddressWithPin ||
      'Anil Automobiles, Chaudhary Petrol Pump, Kachehari Road Mainpuri, U.P. 205001'
  )
  const [state, setState] = useState(initialDraft?.state || 'Uttar Pradesh')
  const [pinCode, setPinCode] = useState(initialDraft?.pinCode || '205001')

  // Card 3: Dispatch Details
  const [despatchChallanNo, setDespatchChallanNo] = useState(initialDraft?.despatchChallanNo || 'KVP-H-610')
  const [dispatchedViaCourierName, setDispatchedViaCourierName] = useState(
    initialDraft?.dispatchedViaCourierName || 'DTDC'
  )
  const [docketNo, setDocketNo] = useState(initialDraft?.docketNo || 'Z49557733')
  const [dispatchDate, setDispatchDate] = useState(initialDraft?.dispatchDate || '19-Nov-2026')
  const [deliveryStatusDate, setDeliveryStatusDate] = useState(initialDraft?.deliveryStatusDate || '24-Nov-2026')
  const [remarks, setRemarks] = useState(initialDraft?.remarks || 'Delivered')

  // Card 4: Document Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // ATM Suggestions dropdown
  const [showAtmSuggestions, setShowAtmSuggestions] = useState(false)

  // Auto-populate when ATM ID is selected
  const handleSelectAtm = (item: (typeof KNOWN_ATMS)[0]) => {
    setAtmId(item.atmId)
    setSiteId(item.siteId)
    setFranchiseeName(item.franchiseeName)
    setFrName(item.frName)
    setFrNumber(item.frNumber)
    setHubLocations(item.hubLocations)
    setFrAddressWithPin(item.frAddressWithPin)
    setState(item.state)
    setPinCode(item.pinCode)
    setShowAtmSuggestions(false)
    toast(`Loaded details for ATM ${item.atmId}`, 'info')
  }

  // Filter known ATMs for autocomplete
  const suggestedAtms = KNOWN_ATMS.filter(
    (k) =>
      k.atmId.toLowerCase().includes(atmId.toLowerCase()) ||
      k.franchiseeName.toLowerCase().includes(atmId.toLowerCase())
  )

  // Handle Save Draft
  const handleSaveDraft = () => {
    const draft: Partial<RpRollRecord> = {
      atmId,
      siteId,
      franchiseeName,
      frName,
      frNumber,
      hubLocations,
      frAddressWithPin,
      state,
      pinCode,
      despatchChallanNo,
      dispatchedViaCourierName,
      docketNo,
      dispatchDate,
      deliveryStatusDate,
      remarks,
    }
    saveStoredDraft(draft)
    toast('RP Roll Request draft saved successfully', 'success')
  }

  // Handle Reset Form
  const handleReset = () => {
    setAtmId('')
    setSiteId('')
    setFranchiseeName('')
    setFrName('')
    setFrNumber('')
    setHubLocations(HUB_LOCATIONS_LIST[0])
    setFrAddressWithPin('')
    setState('Uttar Pradesh')
    setPinCode('')
    setDespatchChallanNo('')
    setDispatchedViaCourierName('DTDC')
    setDocketNo('')
    setDispatchDate('')
    setDeliveryStatusDate('')
    setRemarks('')
    setUploadedFile(null)
    clearStoredDraft()
    toast('Form reset cleared', 'info')
  }

  // Handle Submit for Delivery
  const handleSubmitForDelivery = (e: FormEvent) => {
    e.preventDefault()

    if (!atmId.trim()) {
      toast('Please enter ATM ID', 'error')
      return
    }
    if (!frAddressWithPin.trim()) {
      toast('Please enter FR Address with PIN code', 'error')
      return
    }
    if (!despatchChallanNo.trim()) {
      toast('Please enter Despatch Challan Number', 'error')
      return
    }
    if (!docketNo.trim()) {
      toast('Please enter Courier Docket Number', 'error')
      return
    }

    addRpRollRecord({
      atmId: atmId.trim(),
      siteId: siteId.trim(),
      franchiseeName: franchiseeName.trim(),
      hubLocations: hubLocations.trim(),
      frName: frName.trim(),
      frAddressWithPin: frAddressWithPin.trim(),
      frNumber: frNumber.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      despatchChallanNo: despatchChallanNo.trim(),
      dispatchedViaCourierName: dispatchedViaCourierName.trim(),
      docketNo: docketNo.trim(),
      dispatchDate: dispatchDate.trim() || '19-Nov',
      deliveryStatusDate: deliveryStatusDate.trim() || '24-Nov',
      remarks: remarks.trim() || 'Delivered',
      documentName: uploadedFile?.name,
      status: remarks.trim() || 'Delivered',
    })

    clearStoredDraft()
    toast('RP Roll entry submitted for delivery successfully!', 'success')
    navigate('/operations/rp-rolls')
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 pb-16 font-sans">
      {/* 1. Breadcrumb: [Home Icon] Workspace > Operations > RP Rolls > Entry Form */}
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[12px]">
        <Home size={15} className="text-[#0066FF] shrink-0" />
        <Link to="/dashboard" className="text-[#0066FF] hover:underline font-medium">
          Workspace
        </Link>
        <span className="text-[#94A3B8] font-normal">&gt;</span>
        <Link to="/operations" className="text-[#0066FF] hover:underline font-medium">
          Operations
        </Link>
        <span className="text-[#94A3B8] font-normal">&gt;</span>
        <Link to="/operations/rp-rolls" className="text-[#0066FF] hover:underline font-medium">
          RP Rolls
        </Link>
        <span className="text-[#94A3B8] font-normal">&gt;</span>
        <span className="text-[#0066FF] font-semibold">Entry Form</span>
      </nav>

      {/* 2. Page Header Bar */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0066FF] text-white shadow-md shadow-blue-500/20 shrink-0">
          <RpRollsIcon size={26} color="#FFFFFF" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            RP Rolls – Entry Form
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Enter and manage RP roll dispatch, courier and delivery details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitForDelivery} className="space-y-5">
        {/* Card 1: Site & Franchise Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-[#F1F5F9]">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF] text-white">
              <Building2 size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-[#004BB7]">
              Site & Franchise Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* ATM ID * */}
            <div className="relative">
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  required
                  value={atmId}
                  onChange={(e) => {
                    setAtmId(e.target.value)
                    setShowAtmSuggestions(true)
                  }}
                  onFocus={() => setShowAtmSuggestions(true)}
                  placeholder="e.g. MCRM0389"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white pl-8.5 pr-20 py-2 text-[12.5px] font-medium text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
                {atmId && (
                  <button
                    type="button"
                    onClick={() => setAtmId('')}
                    className="absolute right-19 text-[#94A3B8] hover:text-[#1E293B]"
                  >
                    <X size={13} />
                  </button>
                )}
                {/* Searchable Badge */}
                <button
                  type="button"
                  onClick={() => setShowAtmSuggestions((o) => !o)}
                  className="absolute right-1.5 rounded bg-blue-100 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  Searchable
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showAtmSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1 shadow-xl z-30">
                  {suggestedAtms.length > 0 ? (
                    suggestedAtms.map((item) => (
                      <button
                        key={item.atmId}
                        type="button"
                        onClick={() => handleSelectAtm(item)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] hover:bg-blue-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-bold text-[#0066FF]">{item.atmId}</span>
                        <span className="text-[#64748B] text-[11px] truncate max-w-[120px]">
                          {item.franchiseeName}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-[11px] text-[#64748B]">
                      No ATM matches found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Site ID */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Site ID
              </label>
              <input
                type="text"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="e.g. MCRM1943"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>

            {/* Franchisee Name */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Franchisee Name
              </label>
              <input
                type="text"
                value={franchiseeName}
                onChange={(e) => setFranchiseeName(e.target.value)}
                placeholder="e.g. Siddhant Shakya"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>

            {/* FR Name */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                FR Name
              </label>
              <input
                type="text"
                value={frName}
                onChange={(e) => setFrName(e.target.value)}
                placeholder="Dexter India Management & Services"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>

            {/* FR Number */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                FR Number
              </label>
              <input
                type="text"
                value={frNumber}
                onChange={(e) => setFrNumber(e.target.value)}
                placeholder="e.g. 8755555003"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Location / Address Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-[#F1F5F9]">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF] text-white">
              <MapPin size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-[#004BB7]">
              Location / Address Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Hub Locations */}
            <div className="md:col-span-3">
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Hub Locations
              </label>
              <div className="relative">
                <select
                  value={hubLocations}
                  onChange={(e) => setHubLocations(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] pr-8"
                >
                  {HUB_LOCATIONS_LIST.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            {/* FR Address with PIN Code * */}
            <div className="md:col-span-5">
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                FR Address with PIN Code <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <MapPin size={15} className="absolute left-3 text-[#0066FF] pointer-events-none shrink-0" />
                <input
                  type="text"
                  required
                  value={frAddressWithPin}
                  onChange={(e) => setFrAddressWithPin(e.target.value)}
                  placeholder="Enter complete delivery address with PIN code"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white pl-9 pr-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>
            </div>

            {/* State * */}
            <div className="md:col-span-2">
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                State <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] pr-8"
                >
                  {STATES_LIST.filter((s) => s !== 'All States').map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            {/* Pin Code * */}
            <div className="md:col-span-2">
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Pin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="e.g. 205001"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Dispatch Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-[#F1F5F9]">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF] text-white">
              <PackageCheck size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-[#004BB7]">
              Dispatch Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Despatch Challan No. * */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Despatch Challan No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={despatchChallanNo}
                onChange={(e) => setDespatchChallanNo(e.target.value)}
                placeholder="e.g. KVP-H-610"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] font-medium text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>

            {/* Dispatched Via Courier Name * */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Dispatched Via Courier Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={dispatchedViaCourierName}
                  onChange={(e) => setDispatchedViaCourierName(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] pr-8"
                >
                  {COURIER_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            {/* Docket No. * */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Docket No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={docketNo}
                onChange={(e) => setDocketNo(e.target.value)}
                placeholder="e.g. Z49557733"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] font-mono text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>

            {/* Dispatch Date * */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Dispatch Date <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Calendar size={15} className="absolute left-3 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  required
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  placeholder="19-Nov-2026"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white pl-9 pr-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>
            </div>

            {/* Delivery Status (Date) */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Delivery Status (Date)
              </label>
              <div className="relative flex items-center">
                <Calendar size={15} className="absolute left-3 text-[#0066FF] pointer-events-none" />
                <input
                  type="text"
                  value={deliveryStatusDate}
                  onChange={(e) => setDeliveryStatusDate(e.target.value)}
                  placeholder="24-Nov-2026"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white pl-9 pr-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Delivered"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[12.5px] text-[#1E293B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Document Upload */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-[#F1F5F9]">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0066FF] text-white">
              <FileUp size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-[#004BB7]">
              Document Upload
            </h2>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1E293B] mb-1.5">
              Upload Documents (if any)
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <Paperclip size={16} className="text-[#0066FF] shrink-0" />
                <label className="cursor-pointer rounded-md border border-[#CBD5E1] bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-[#1E293B] hover:bg-slate-100 transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadedFile(e.target.files[0])
                        toast(`Attached ${e.target.files[0].name}`, 'info')
                      }
                    }}
                  />
                </label>
                <span className="text-[12px] text-[#64748B]">
                  {uploadedFile ? uploadedFile.name : 'No file chosen'}
                </span>
              </div>
              <span className="text-[11px] text-[#94A3B8]">
                (Upload JPG, PNG or PDF, Max 5 MB)
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          {/* Left: Back button */}
          <button
            type="button"
            onClick={() => navigate('/operations/rp-rolls')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0066FF] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0066FF] hover:bg-blue-50/70 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          {/* Right: Reset, Save Draft, Submit for Delivery */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0066FF] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0066FF] hover:bg-blue-50/70 transition-all cursor-pointer"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0066FF] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0066FF] hover:bg-blue-50/70 transition-all cursor-pointer"
            >
              <Save size={15} />
              Save Draft
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0066FF] px-6 py-2.5 text-[13px] font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#0052CC] transition-all cursor-pointer"
            >
              <Send size={15} />
              Submit for Delivery
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
