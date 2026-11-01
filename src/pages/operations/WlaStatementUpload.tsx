import { useState, useRef, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ChevronDown,
  Search,
  Calendar,
  MapPin,
  Building2,
  Phone,
  Smartphone,
  Mail,
  CloudUpload,
  FileText,
  FileCheck,
  Trash2,
  ArrowLeft,
  X,
  Eye,
} from 'lucide-react'
import {
  useWlaStatements,
} from '@/data/wlaStatements'
import {
  KNOWN_TDS_ATMS,
  type UploadedDocItem,
  type AtmProfile,
} from '@/data/tdsLetters'
import { toast } from '@/components/ui/Toast'

export default function WlaStatementUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addOrUpdateRecord, records } = useWlaStatements()

  // ATM ID & Month selection
  const paramAtmId = searchParams.get('atmId') || ''
  const [atmSearchQuery, setAtmSearchQuery] = useState(paramAtmId || 'ATM001')
  const [selectedAtmId, setSelectedAtmId] = useState<string>(paramAtmId || 'ATM001')
  const [showAtmDropdown, setShowAtmDropdown] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('October 2026')

  // Uploaded documents state
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Remarks
  const [remarks, setRemarks] = useState('')

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<UploadedDocItem | null>(null)
  const [showAllUploadedModal, setShowAllUploadedModal] = useState(false)

  // Month options
  const monthOptions = [
    'Select Month & Year (e.g. Oct 2026)',
    'October 2026',
    'November 2026',
    'September 2026',
    'August 2026',
    'July 2026',
  ]

  // Filter ATM options based on user typing
  const allKnownAtms = useMemo(() => Object.values(KNOWN_TDS_ATMS), [])
  const filteredAtmOptions = useMemo(() => {
    if (!atmSearchQuery.trim()) return allKnownAtms
    const q = atmSearchQuery.toLowerCase()
    return allKnownAtms.filter(
      (a) =>
        a.atmId.toLowerCase().includes(q) ||
        a.siteId.toLowerCase().includes(q) ||
        a.franchiseName.toLowerCase().includes(q),
    )
  }, [allKnownAtms, atmSearchQuery])

  // Current active ATM profile
  const activeProfile: AtmProfile = useMemo(() => {
    if (selectedAtmId && KNOWN_TDS_ATMS[selectedAtmId]) {
      return KNOWN_TDS_ATMS[selectedAtmId]
    }
    return {
      atmId: 'ATM001',
      hitachiCode: 'HTH-1001',
      siteId: 'S-1001',
      franchiseName: 'Shree Sai Financial Services',
      contactNo: '+91 98765 43210',
      email: 'sai.financial@gmail.com',
      model: 'Hitachi ATM Model XYZ',
      locationName: 'Lucknow',
      state: 'UP',
      acStatus: 'Current Account',
    }
  }, [selectedAtmId])

  // If existing record has documents for this ATM & Month, load them
  useEffect(() => {
    if (selectedAtmId && selectedMonth) {
      const match = records.find(
        (r) => r.atmId.toLowerCase() === selectedAtmId.toLowerCase() && r.month === selectedMonth,
      )
      if (match && match.uploadedDocuments && match.uploadedDocuments.length > 0) {
        setUploadedDocs(match.uploadedDocuments)
        if (match.remark) setRemarks(match.remark)
      }
    }
  }, [selectedAtmId, selectedMonth, records])

  const handleSelectAtm = (atm: AtmProfile) => {
    setSelectedAtmId(atm.atmId)
    setAtmSearchQuery(atm.atmId)
    setShowAtmDropdown(false)
  }

  // Handle file uploads
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newDocs: UploadedDocItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        toast(`File "${file.name}" exceeds 10 MB limit`, 'error')
        continue
      }
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`

      const now = new Date()
      const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-')
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

      newDocs.push({
        id: `DOC-WLA-${Date.now()}-${i}`,
        fileName: file.name,
        uploadedOn: `${dateStr} ${timeStr}`,
        uploadedBy: 'Paras Dubey (Operations)',
        size: sizeStr,
      })
    }

    if (newDocs.length > 0) {
      setUploadedDocs((prev) => [...prev, ...newDocs])
      toast(`${newDocs.length} statement document(s) uploaded successfully`)
    }
  }

  const handleDeleteDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id))
    toast('Document removed')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAtmId) {
      toast('Please search and select an ATM ID', 'error')
      return
    }

    if (!selectedMonth || selectedMonth.startsWith('Select')) {
      toast('Please select a valid Month & Year', 'error')
      return
    }

    if (uploadedDocs.length === 0) {
      toast('Please upload at least one WLA statement document before submitting', 'error')
      return
    }

    // Save or update in store
    addOrUpdateRecord({
      atmId: activeProfile.atmId,
      month: selectedMonth,
      siteId: activeProfile.siteId,
      hitachiCode: activeProfile.hitachiCode,
      franchiseName: activeProfile.franchiseName,
      contactNo: activeProfile.contactNo,
      email: activeProfile.email,
      model: activeProfile.model,
      locationName: activeProfile.locationName,
      state: activeProfile.state,
      acStatus: activeProfile.acStatus,
      remark: remarks.trim() || 'WLA statement received',
      uploadedDocuments: uploadedDocs,
    })

    toast(`WLA statement submitted successfully for ${activeProfile.atmId}`)
    navigate('/operations/wla-statement')
  }

  return (
    <div className="w-full min-w-0 pb-16 font-sans space-y-4">
      {/* Breadcrumb matching Image 2: Home > Workspace > Operations > WLA Statement */}
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
        <Link to="/operations/wla-statement" className="hover:text-[#0066FF] transition-colors">
          WLA Statement
        </Link>
      </div>

      {/* Page Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[26px]">
          WLA Statement
        </h1>
        <p className="mt-0.5 text-[13px] text-[#64748B]">
          Upload and manage WLA statement for the selected ATM and month.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card 1: ATM & Month Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          {/* Card Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
              <FileCheck size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">ATM & Month Details</h3>
              <p className="text-[12px] text-[#64748B]">
                Search and select ATM to fetch franchise details automatically.
              </p>
            </div>
          </div>

          {/* Input Row: ATM ID * and Month * */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* ATM ID * with search input & dropdown */}
            <div className="relative">
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                ATM ID <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-[#0066FF]">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Search ATM ID (e.g. ATM001)"
                  value={atmSearchQuery}
                  onFocus={() => setShowAtmDropdown(true)}
                  onChange={(e) => {
                    setAtmSearchQuery(e.target.value)
                    setShowAtmDropdown(true)
                  }}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2.5 pl-10 pr-9 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowAtmDropdown((p) => !p)}
                  className="absolute right-3 text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                >
                  <ChevronDown size={15} />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showAtmDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-30">
                  {filteredAtmOptions.length === 0 ? (
                    <div className="px-4 py-2.5 text-[12.5px] text-slate-500">
                      No matching ATM found
                    </div>
                  ) : (
                    filteredAtmOptions.map((atm) => (
                      <button
                        type="button"
                        key={atm.atmId}
                        onClick={() => handleSelectAtm(atm)}
                        className={`w-full px-4 py-2 text-left text-[12.5px] hover:bg-blue-50/70 flex items-center justify-between cursor-pointer ${
                          selectedAtmId === atm.atmId ? 'bg-blue-50 text-[#0066FF] font-semibold' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{atm.atmId}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{atm.franchiseName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{atm.siteId}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Month * */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Month <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-[#0066FF]">
                  <Calendar size={15} />
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2.5 pl-10 pr-9 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF] cursor-pointer font-medium"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 text-[#64748B]" />
              </div>
            </div>
          </div>

          {/* Auto-fetched Info Cards (5 cards in horizontal grid matching Image 2) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 pt-1">
            {/* 1. Site ID */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF]">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-[#64748B]">Site ID</span>
                <span className="block text-[13px] font-semibold text-[#1E293B] truncate">
                  {activeProfile.siteId}
                </span>
              </div>
            </div>

            {/* 2. Franchisee Name */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF]">
                <Building2 size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-[#64748B]">Franchisee Name</span>
                <span className="block text-[13px] font-semibold text-[#1E293B] truncate" title={activeProfile.franchiseName}>
                  {activeProfile.franchiseName}
                </span>
              </div>
            </div>

            {/* 3. Mobile Number */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF]">
                <Phone size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-[#64748B]">Mobile Number</span>
                <span className="block text-[13px] font-semibold text-[#1E293B] truncate">
                  {activeProfile.contactNo}
                </span>
              </div>
            </div>

            {/* 4. Model */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF]">
                <Smartphone size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-[#64748B]">Model</span>
                <span className="block text-[13px] font-semibold text-[#1E293B] truncate" title={activeProfile.model}>
                  {activeProfile.model}
                </span>
              </div>
            </div>

            {/* 5. Email ID */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF]">
                <Mail size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-[#64748B]">Email ID</span>
                <span className="block text-[13px] font-semibold text-[#1E293B] truncate" title={activeProfile.email}>
                  {activeProfile.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: WLA Statement Document */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          {/* Card Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
              <CloudUpload size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">WLA Statement Document</h3>
              <p className="text-[12px] text-[#64748B]">
                Upload the WLA statement document for the selected ATM and month.
              </p>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 px-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#0066FF] bg-blue-50/50 scale-[0.99]'
                : 'border-[#CBD5E1] bg-white hover:border-[#0066FF] hover:bg-[#F8FAFC]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0066FF]">
              <CloudUpload size={26} strokeWidth={2.2} />
            </div>
            <p className="text-[14px] font-bold text-[#1E293B]">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-[12px] text-[#64748B]">
              PDF, JPG, PNG (Max size: 10 MB)
            </p>
          </div>
        </div>

        {/* Card 3: Uploaded Documents */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
                <FileText size={16} />
              </div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">Uploaded Documents</h3>
            </div>

            <button
              type="button"
              onClick={() => setShowAllUploadedModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0066FF] hover:bg-blue-50/50 cursor-pointer shadow-xs"
            >
              <FileText size={14} />
              <span>View Uploaded Documents ({uploadedDocs.length})</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  <th className="py-2.5 px-4 text-center w-14">S.No.</th>
                  <th className="py-2.5 px-4">File Name</th>
                  <th className="py-2.5 px-4">Uploaded On</th>
                  <th className="py-2.5 px-4">Uploaded By</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[12.5px] text-[#334155]">
                {uploadedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <FileText size={32} className="mb-2 text-slate-300" strokeWidth={1.5} />
                        <span className="text-[13px] text-slate-500 font-medium">
                          No documents uploaded yet.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  uploadedDocs.map((doc, idx) => (
                    <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 text-center text-[#64748B] font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-[#1E293B]">
                        <div className="flex items-center gap-2">
                          <FileText size={15} className="text-[#0066FF] shrink-0" />
                          <span className="truncate max-w-xs">{doc.fileName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{doc.uploadedOn}</td>
                      <td className="py-3 px-4 text-[#475569]">{doc.uploadedBy}</td>
                      <td className="py-3 px-4 text-[#64748B]">{doc.size}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            title="Preview file"
                            className="p-1 text-[#0066FF] hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            title="Delete file"
                            className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 4: Remarks */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-3">
          {/* Card Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0066FF] text-white shadow-xs">
              <Mail size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">Remarks</h3>
              <p className="text-[12px] text-[#64748B]">Add any additional remarks or notes.</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Remark</label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Enter remarks (optional)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
            />
            <div className="mt-1 text-right text-[11px] text-[#94A3B8]">
              {remarks.length}/500
            </div>
          </div>
        </div>

        {/* Bottom Bar: Back & Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link
            to="/operations/wla-statement"
            className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#334155] hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <FileText size={16} />
            <span>Submit</span>
          </button>
        </div>
      </form>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0066FF]" />
                <h3 className="text-[15px] font-bold text-slate-900 truncate max-w-sm">
                  {previewDoc.fileName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mx-auto">
                <FileCheck size={32} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-slate-800">{previewDoc.fileName}</h4>
                <p className="text-[12px] text-slate-500 mt-1">
                  Size: {previewDoc.size} • Uploaded On: {previewDoc.uploadedOn}
                </p>
                <p className="text-[12px] text-slate-500">By: {previewDoc.uploadedBy}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-[12px] text-slate-600 border border-slate-200 text-left space-y-1">
                <p><strong>ATM ID:</strong> {activeProfile.atmId}</p>
                <p><strong>Franchisee:</strong> {activeProfile.franchiseName}</p>
                <p><strong>Selected Month:</strong> {selectedMonth}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3.5 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Uploaded Documents Modal */}
      {showAllUploadedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0066FF]" />
                <h3 className="text-[15px] font-bold text-slate-900">
                  Uploaded WLA Statements ({uploadedDocs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllUploadedModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {uploadedDocs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-[13px] text-slate-500 font-medium">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {uploadedDocs.map((doc, i) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] text-slate-400 font-bold">{i + 1}.</span>
                        <FileText size={16} className="text-[#0066FF]" />
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800">{doc.fileName}</p>
                          <p className="text-[11px] text-slate-500">{doc.uploadedOn} • {doc.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3.5 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setShowAllUploadedModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
