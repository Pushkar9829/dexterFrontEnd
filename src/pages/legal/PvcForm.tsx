import { useState, useRef, useId, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronDown,
  Building2,
  Search,
  Info,
  Calendar,
  UploadCloud,
  FileText,
  MessageSquare,
  ArrowLeft,
  X,
  CheckCircle2,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import {
  addPvcRecord,
  getPvcRecord,
  updatePvcRecord,
  type PvcStatus,
} from '@/data/legalPvc'

interface SiteOption {
  siteLoi: string
  siteId: string
  atmId: string
  franchiseeName: string
  mobileNumber: string
  model: string
  email: string
}

const PRESET_SITES: SiteOption[] = [
  {
    siteLoi: 'SIT-2025-001',
    siteId: 'S-1001',
    atmId: 'ATM001',
    franchiseeName: 'Shree Sai Financial Services',
    mobileNumber: '+91 98765 43210',
    model: 'Hitachi ATM Model XYZ',
    email: 'sai.financial@gmail.com',
  },
  {
    siteLoi: 'SIT-2025-005',
    siteId: 'S-1005',
    atmId: 'ATM003',
    franchiseeName: 'Om Finserve',
    mobileNumber: '+91 98123 45678',
    model: 'GRG ATM Model ABC',
    email: 'contact@omfinserve.in',
  },
  {
    siteLoi: 'SIT-2025-012',
    siteId: 'S-1012',
    atmId: 'ATM007',
    franchiseeName: 'Kuber ATM Solutions',
    mobileNumber: '+91 97654 32109',
    model: 'NCR ATM Model 5886',
    email: 'info@kuberatm.in',
  },
  {
    siteLoi: 'SIT-2025-018',
    siteId: 'S-1018',
    atmId: 'ATM011',
    franchiseeName: 'Madhav Enterprises',
    mobileNumber: '+91 98987 65432',
    model: 'Diebold ATM Model 5500',
    email: 'madhav.ent@gmail.com',
  },
  {
    siteLoi: 'SIT-2025-024',
    siteId: 'S-1024',
    atmId: 'ATM015',
    franchiseeName: 'Shakti Associates',
    mobileNumber: '+91 90012 34567',
    model: 'Hitachi ATM Model ABC',
    email: 'shakti.assoc@outlook.com',
  },
  {
    siteLoi: 'SIT-2025-031',
    siteId: 'S-1031',
    atmId: 'ATM019',
    franchiseeName: 'Balaji Payments & ATM',
    mobileNumber: '+91 98450 67890',
    model: 'Hyosung ATM 2800',
    email: 'balaji.atm@fintech.in',
  },
]

export default function PvcForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const remarkTextareaId = useId()

  const existingRecord = id ? getPvcRecord(id) : undefined
  const isEdit = Boolean(existingRecord)

  // Selected site data
  const [selectedSite, setSelectedSite] = useState<SiteOption>(PRESET_SITES[0])
  const [searchQuery, setSearchQuery] = useState(PRESET_SITES[0].siteLoi)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // PVC Details: PVC Date & Expiry Date
  const [pvcDate, setPvcDate] = useState('01/08/2025')
  const [expiryDate, setExpiryDate] = useState('31/07/2027')

  // Document Upload state
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Remarks state
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (existingRecord) {
      const matchSite = PRESET_SITES.find(
        (s) => s.siteId === existingRecord.siteId
      )
      if (matchSite) {
        setSelectedSite(matchSite)
        setSearchQuery(matchSite.siteLoi)
      } else {
        setSelectedSite({
          siteLoi: existingRecord.siteLoi || existingRecord.siteId,
          siteId: existingRecord.siteId,
          atmId: existingRecord.atmId,
          franchiseeName: existingRecord.franchiseName,
          mobileNumber: existingRecord.mobileNumber,
          model: existingRecord.model,
          email: existingRecord.email,
        })
        setSearchQuery(existingRecord.siteLoi || existingRecord.siteId)
      }
      setPvcDate(existingRecord.pvcDate)
      setExpiryDate(existingRecord.expiryDate)
      setRemarks(existingRecord.remark === '-' ? '' : existingRecord.remark)
    }
  }, [existingRecord])

  // Filtered dropdown options
  const filteredSites = PRESET_SITES.filter(
    (s) =>
      s.siteLoi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.atmId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.franchiseeName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectSite = (site: SiteOption) => {
    setSelectedSite(site)
    setSearchQuery(site.siteLoi)
    setIsDropdownOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 10 * 1024 * 1024) {
      toast('File size exceeds 10 MB limit')
      return
    }

    setFile(selected)
    toast(`Selected file: ${selected.name}`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return

    if (dropped.size > 10 * 1024 * 1024) {
      toast('File size exceeds 10 MB limit')
      return
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(dropped.type) && !/\.(pdf|jpg|jpeg|png)$/i.test(dropped.name)) {
      toast('Please upload a valid PDF, JPG, or PNG file')
      return
    }

    setFile(dropped)
    toast(`Uploaded: ${dropped.name}`)
  }

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim() || !selectedSite.siteId) {
      toast('Please select a Site/LOI Number')
      return
    }

    if (!pvcDate.trim()) {
      toast('Please enter PVC Date')
      return
    }

    if (!expiryDate.trim()) {
      toast('Please enter Expiry Date')
      return
    }

    setIsSubmitting(true)

    const fileName = file
      ? file.name
      : existingRecord?.fileName || `PVC_${selectedSite.siteId}_Signed.pdf`
    const fileSizeKb = file
      ? Math.round(file.size / 1024)
      : existingRecord?.fileSizeKb || 1420

    const status: PvcStatus = file || existingRecord?.fileName ? 'Active' : 'Pending'

    if (isEdit && existingRecord) {
      updatePvcRecord(existingRecord.id, {
        siteId: selectedSite.siteId,
        siteLoi: selectedSite.siteLoi,
        atmId: selectedSite.atmId,
        franchiseName: selectedSite.franchiseeName,
        mobileNumber: selectedSite.mobileNumber,
        model: selectedSite.model,
        email: selectedSite.email,
        pvcDate,
        expiryDate,
        fileName,
        fileSizeKb,
        remark: remarks.trim() || 'Verified',
        status: existingRecord.status === 'Not Generated' ? 'Active' : existingRecord.status,
      })
      toast('Police Verification Certificate (PVC) updated successfully')
    } else {
      addPvcRecord({
        siteId: selectedSite.siteId,
        siteLoi: selectedSite.siteLoi,
        atmId: selectedSite.atmId,
        franchiseName: selectedSite.franchiseeName,
        mobileNumber: selectedSite.mobileNumber,
        model: selectedSite.model,
        email: selectedSite.email,
        pvcDate,
        expiryDate,
        fileName,
        fileSizeKb,
        remark: remarks.trim() || 'Verified',
        status,
      })
      toast('New Police Verification Certificate (PVC) created successfully')
    }

    setTimeout(() => {
      setIsSubmitting(false)
      navigate('/legal/pvc')
    }, 400)
  }

  return (
    <div className="max-w-[1320px] mx-auto pb-16 space-y-4">
      {/* Breadcrumb matching image: [Home Icon] > Workspace > Legal > PVC > New PVC */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-2">
        <Link
          to="/dashboard"
          className="text-[#0066FF] hover:opacity-80 transition-opacity flex items-center"
          title="Home"
        >
          <Home size={14} />
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="text-slate-500">Workspace</span>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Legal
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link to="/legal/pvc" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          PVC
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isEdit ? 'Edit PVC' : 'New PVC'}
        </span>
      </nav>

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
          {isEdit ? 'Edit Police Verification Certificate (PVC)' : 'New Police Verification Certificate (PVC)'}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Upload and manage Police Verification Certificate (PVC) for the selected site.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CARD 1: Site Details */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 leading-tight">
                Site Details
              </h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">
                Search and select site to fetch franchise details automatically.
              </p>
            </div>
          </div>

          {/* Search Field */}
          <div className="relative mb-3.5" ref={dropdownRef}>
            <label className="block text-[12px] font-semibold text-slate-800 mb-1.5">
              Site/LOI Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search Site/LOI Number (e.g. SIT-2025-001)"
                className="w-full h-10.5 pl-10 pr-10 text-[13px] rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                tabIndex={-1}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  <div className="px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70">
                    Select a Site / LOI Candidate
                  </div>
                  {filteredSites.map((site) => (
                    <button
                      key={site.siteLoi}
                      type="button"
                      onClick={() => handleSelectSite(site)}
                      className={`w-full text-left px-3.5 py-2.5 text-[12.5px] hover:bg-[#F0F5FA] flex items-center justify-between transition-colors ${
                        selectedSite.siteLoi === site.siteLoi ? 'bg-[#EEF4FC] font-semibold text-[#0066FF]' : 'text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold">{site.siteLoi}</span>
                        <span className="text-[11.5px] text-slate-400">({site.siteId})</span>
                        <span className="text-[11.5px] text-slate-500 font-normal">
                          · {site.franchiseeName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{site.atmId}</span>
                    </button>
                  ))}
                  {filteredSites.length === 0 && (
                    <div className="px-4 py-4 text-center text-[12px] text-slate-400">
                      No sites found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Blue Info Alert matching image PVC 02 */}
          <div className="mb-4 bg-[#EEF4FC] border border-[#D5E5F8] rounded-xl px-4 py-2.5 flex items-center gap-2 text-[12.5px] text-[#0066FF]">
            <Info size={16} className="text-[#0066FF] shrink-0" />
            <span>Details will be auto-fetched after selecting a site.</span>
          </div>

          {/* 6 Auto-filled Readonly/Tinted Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Site ID */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Site ID
              </label>
              <div
                className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate"
                title={selectedSite.siteId}
              >
                {selectedSite.siteId || '—'}
              </div>
            </div>

            {/* ATM ID */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                ATM ID
              </label>
              <div
                className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate"
                title={selectedSite.atmId}
              >
                {selectedSite.atmId || '—'}
              </div>
            </div>

            {/* Franchisee Name */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Franchisee Name
              </label>
              <div
                className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate"
                title={selectedSite.franchiseeName}
              >
                {selectedSite.franchiseeName || '—'}
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div
                className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate"
                title={selectedSite.mobileNumber}
              >
                {selectedSite.mobileNumber || '—'}
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Model
              </label>
              <div
                className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate"
                title={selectedSite.model}
              >
                {selectedSite.model || '—'}
              </div>
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Email ID
              </label>
              <div
                className="h-10 px-3.5 rounded-xl bg-[#F0F5FA] border border-[#E2ECF8] text-[12.5px] font-medium text-slate-800 flex items-center truncate"
                title={selectedSite.email}
              >
                {selectedSite.email || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: PVC Details */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 leading-tight">
                PVC Details
              </h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">
                Enter PVC issue date and expiry date.
              </p>
            </div>
          </div>

          {/* PVC Date & Expiry Date Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PVC Date * */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-800 mb-1.5">
                PVC Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={pvcDate}
                  onChange={(e) => setPvcDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-10.5 pl-10 pr-3 text-[13px] rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] shadow-2xs"
                />
              </div>
            </div>

            {/* Expiry Date * */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-800 mb-1.5">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-10.5 pl-10 pr-3 text-[13px] rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Upload PVC Document */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 leading-tight">
                Upload PVC Document
              </h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">
                Upload the Police Verification Certificate for the selected site.
              </p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
          />

          {/* Dropzone matching reference design */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl py-10 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#0066FF] bg-[#EEF4FC]'
                : file || existingRecord?.fileName
                ? 'border-[#B8D5FA] bg-[#F7FAFD]'
                : 'border-[#BCD5F5] bg-[#F8FAFD] hover:bg-[#F2F6FB] hover:border-[#0066FF]'
            }`}
          >
            {file || existingRecord?.fileName ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0066FF] mb-2.5">
                  <FileText size={26} />
                </div>
                <div className="text-[14px] font-bold text-slate-900">
                  {file ? file.name : existingRecord?.fileName}
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${((existingRecord?.fileSizeKb || 1420) / 1024).toFixed(2)} MB`}{' '}
                  · Ready to upload
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={13} /> Document attached
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <X size={13} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-blue-50/50 flex items-center justify-center text-[#0066FF] mb-2">
                  <UploadCloud size={38} className="stroke-[1.75]" />
                </div>
                <div className="text-[14px] font-semibold text-slate-900">
                  Click to upload <span className="font-normal text-slate-600">or drag and drop</span>
                </div>
                <div className="text-[12px] text-slate-400 mt-1">
                  PDF, JPG, PNG (Max size: 10 MB)
                </div>
              </>
            )}
          </div>
        </div>

        {/* CARD 4: Remarks */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 leading-tight">
                Remarks
              </h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">
                Add any additional remarks or notes.
              </p>
            </div>
          </div>

          {/* Remark Textarea */}
          <div>
            <label htmlFor={remarkTextareaId} className="block text-[12px] font-semibold text-slate-800 mb-1.5">
              Remark
            </label>
            <textarea
              id={remarkTextareaId}
              rows={3}
              maxLength={500}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks (optional)..."
              className="w-full p-3.5 text-[13px] rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition-all resize-none shadow-2xs"
            />
            <div className="text-right text-[11.5px] text-slate-400 mt-1">
              {remarks.length}/500
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between pt-2">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => navigate('/legal/pvc')}
            className="h-10 px-5 rounded-xl border border-[#B8D5FA] bg-white text-[#0066FF] hover:bg-[#F0F5FA] font-medium text-[13px] flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={16} /> Cancel
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[13px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FileText size={16} /> Submit
          </button>
        </div>
      </form>
    </div>
  )
}
