import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  FolderOpen,
  Search,
  Calendar,
  UploadCloud,
  ChevronDown,
  Check,
  ArrowLeft,
  X,
  File,
} from 'lucide-react'
import {
  getOtherDocRecord,
  saveOtherDoc,
  otherDocsLoader,
  type OtherDocCategory,
  type OtherDocStatus,
  type OtherDocFile,
} from '@/data/legalOtherDocs'
import { useLegalSiteOptions } from '@/data/legalCheques'
import { apiEnabled } from '@/lib/api'
import { uploadLegalFiles } from '@/data/legalApi'
import { toast } from '@/components/ui/Toast'
import { ViewOnlyNote, canIn, guardAct, useCanIn } from '@/lib/guard'
import { franchiseNameOf, resolveSite, SiteRef } from '@/lib/siteRef'
import { emitWorkflow } from '@/data/workflow'

export default function OtherDocForm() {
  const KNOWN_SITES = useLegalSiteOptions()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const allow = useCanIn('Legal')
  const canSave = allow(isEditing ? 'Edit' : 'Create')
  const [siteError, setSiteError] = useState('')

  // Section 1: Site Details
  const [siteId, setSiteId] = useState('')

  // Section 2: Auto-Fetched Details
  const [atmId, setAtmId] = useState('')
  const [franchiseeName, setFranchiseeName] = useState('')
  const [model, setModel] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  // Section 3: Document Details
  const [category, setCategory] = useState<OtherDocCategory | ''>('')
  const [docTitle, setDocTitle] = useState('')
  const [docRefNumber, setDocRefNumber] = useState('')
  const [issuingAuthority, setIssuingAuthority] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Section 4: Upload Documents
  const [documents, setDocuments] = useState<OtherDocFile[]>([])
  const [verifiedBy, setVerifiedBy] = useState('Paras Dubey')

  // Section 5: Status & Remarks
  const [status, setStatus] = useState<OtherDocStatus>(() => (canIn('Legal', 'Approve') ? 'Verified' : 'Pending Review'))
  const [remark, setRemark] = useState('')

  useEffect(() => {
    if (id) {
      // API mode: wait for GET /legal/other-docs before looking the record up
      void otherDocsLoader.load().then(() => {
      const existing = getOtherDocRecord(id)
      if (existing) {
        setSiteId(existing.siteId)
        setAtmId(existing.atmId)
        setFranchiseeName(existing.franchiseeName)
        setModel(existing.model)
        setMobileNumber(existing.mobileNumber)
        setCategory(existing.category)
        setDocTitle(existing.docTitle)
        setDocRefNumber(existing.docRefNumber)
        setIssuingAuthority(existing.issuingAuthority)
        setIssueDate(existing.issueDate)
        setExpiryDate(existing.expiryDate)
        setDocuments(existing.documents || [])
        setVerifiedBy(existing.verifiedBy)
        setStatus(existing.status)
        setRemark(existing.remark)
      } else {
        toast('Document record not found')
        navigate('/legal/other-documents')
      }
      })
    }
  }, [id, navigate])

  const handleSiteChange = (selectedSiteId: string) => {
    setSiteId(selectedSiteId)
    setSiteError(selectedSiteId && !resolveSite(selectedSiteId) ? 'Not found in Site Master' : '')
    const site = KNOWN_SITES.find((s) => s.siteId === selectedSiteId)
    if (site) {
      setAtmId(site.atmId)
      setFranchiseeName(site.franchiseeName)
      setModel(site.model)
      setMobileNumber(site.mobileNumber)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const picked = Array.from(files)
    e.target.value = ''

    // API mode: each file goes to POST /files first (fileId kept on the record)
    const newDocs: OtherDocFile[] | null = await uploadLegalFiles(picked, { entity: 'LegalOtherDoc', ref: id ?? siteId }).catch(() => null)
    if (!newDocs) return

    setDocuments((prev) => [...prev, ...newDocs])
    toast(`Uploaded ${newDocs.length} file(s)`)
  }

  const handleRemoveDoc = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guardAct('Legal', isEditing ? 'Edit' : 'Create', isEditing ? 'edit legal documents' : 'add legal documents')) return
    // marking a document Verified is an approval; Action Required / Expired is a rejection
    if (status === 'Verified' && !guardAct('Legal', 'Approve', 'verify documents')) return
    if ((status === 'Action Required' || status === 'Expired') && !guardAct('Legal', 'Reject', 'reject documents')) return

    if (!siteId) {
      toast('Please select a Site ID')
      return
    }
    const master = resolveSite(siteId)
    if (!master) {
      setSiteError(`"${siteId}" is not in Site Master. Pick a valid Site ID.`)
      toast('Site ID not found in Site Master', 'error')
      return
    }
    if (!category) {
      toast('Please select a Document Category')
      return
    }
    if (!docTitle) {
      toast('Please enter Document Title')
      return
    }

    const todayStr = new Date().toLocaleDateString('en-GB')
    const recordPayload = {
      siteId: master.siteId,
      atmId: master.atmId,
      franchiseeName: franchiseNameOf(master) || franchiseeName,
      mobileNumber: mobileNumber || '+91 98765 43210',
      model: model || 'Hitachi ATM Model XYZ',
      category: category as OtherDocCategory,
      docTitle,
      docRefNumber: docRefNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      issuingAuthority: issuingAuthority || 'Authorized Registry Office',
      issueDate: issueDate || todayStr,
      expiryDate: expiryDate || '31/12/2028',
      status,
      verifiedBy,
      verificationDate: todayStr,
      documents: documents.length > 0 || apiEnabled ? documents : [
        { name: `${siteId}_${category.replace(/\s+/g, '_')}.pdf`, sizeKb: 1450, type: 'application/pdf' },
      ],
      remark,
    }

    const wf = (refId: string) => {
      const doc = recordPayload.category
      const vars = { Site_ID: master.siteId, ATM_ID: master.atmId, Franchise_Name: recordPayload.franchiseeName, Current_Status: status }
      if (status === 'Verified') emitWorkflow({ module: 'Legal', event: 'Approve', refId, vars })
      else if (status === 'Action Required' || status === 'Expired')
        emitWorkflow({ module: 'Legal', event: 'Reject', refId, vars: { ...vars, Pending_Action: `Re-upload ${doc}` }, nextAction: { title: `Re-upload ${doc}`, dueHours: 72 } })
      else emitWorkflow({ module: 'Legal', event: 'Submit', refId, vars, nextAction: { title: `Verify ${doc}`, dueHours: 48 } })
    }

    // API mode: the server emits the workflow events and sets verifiedBy / date on verification
    const saved = await saveOtherDoc(isEditing ? id : undefined, recordPayload).catch(() => null)
    if (!saved) return
    if (!apiEnabled) wf(saved.id)
    toast(isEditing ? 'Document record updated successfully' : 'Document record created successfully')
    navigate(`/legal/other-documents/${saved.id}`)
  }

  return (
    <div className="max-w-[1240px] mx-auto pb-16 space-y-4">
      {/* Top Breadcrumb */}
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
        <Link to="/legal/other-documents" className="text-slate-500 hover:text-[#0066FF] transition-colors">
          Other Legal Documents
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {isEditing ? 'Edit Document' : 'New Document'}
        </span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center gap-3.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
          <FolderOpen size={20} />
        </div>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-slate-900 leading-tight">
            {isEditing ? 'Edit Legal Document' : 'New Legal Document'}
          </h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">
            Enter details and upload supplementary deeds, bank mandates, society NOCs, or board resolutions.
          </p>
        </div>
      </div>

      <ViewOnlyNote module="Legal" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: Site Details */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              1
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Site Details</h2>
          </div>

          <div className="max-w-md">
            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
              Site ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
              <select
                value={siteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                required
                className="w-full h-9 pl-8 pr-8 text-[12.5px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
              >
                <option value="">Search Site ID (e.g. SITE-MH-0001)</option>
                {siteId && !KNOWN_SITES.some((s) => s.siteId === siteId) && <option value={siteId}>{siteId}</option>}
                {KNOWN_SITES.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteId} - {s.franchiseeName} ({s.atmId})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {siteError && <p className="mt-1 text-[11.5px] font-medium text-red-600">{siteError}</p>}
            {siteId && !siteError && <p className="mt-1 text-[11.5px] text-slate-500">Site Master: <SiteRef id={siteId} /></p>}
          </div>
        </div>

        {/* SECTION 2: Auto-Fetched Details */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              2
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Auto-Fetched Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                ATM ID
              </label>
              <input
                type="text"
                value={atmId}
                readOnly
                placeholder="Auto-fetched ATM ID"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Franchisee Name
              </label>
              <input
                type="text"
                value={franchiseeName}
                readOnly
                placeholder="Auto-fetched Franchisee Name"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={model}
                readOnly
                placeholder="Auto-fetched Model"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={mobileNumber}
                readOnly
                placeholder="Auto-fetched Mobile Number"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 outline-none cursor-not-allowed font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Document Details */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              3
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Document Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Document Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as OtherDocCategory)}
                  required
                  className="w-full h-8.5 px-3 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="">Select category</option>
                  <option value="Bank Mandate">Bank Mandate</option>
                  <option value="Power of Attorney">Power of Attorney</option>
                  <option value="NOC Clearance">NOC Clearance</option>
                  <option value="Indemnity Bond">Indemnity Bond</option>
                  <option value="Rent Agreement">Rent Agreement</option>
                  <option value="Board Resolution">Board Resolution</option>
                  <option value="Property Deed">Property Deed</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Registered Rent Deed / Bank Settlement Mandate"
                required
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Reference / Stamp Number */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Doc Ref / Stamp Number
              </label>
              <input
                type="text"
                value={docRefNumber}
                onChange={(e) => setDocRefNumber(e.target.value)}
                placeholder="e.g. REF-2025-09281"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            {/* Issuing Authority / Bank */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Issuing Authority / Bank / Society
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g. Sub-Registrar / HDFC Bank / Society"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
              />
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Issue Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Expiry / Renewal Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-8.5 pl-8 pr-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Upload Documents */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              4
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Upload Documents & Files</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Dropzone */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Upload Scanned File(s)
              </label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/20 hover:bg-blue-50/40 transition-colors cursor-pointer text-center">
                <UploadCloud size={26} className="text-[#0066FF] mb-1.5" />
                <span className="text-[12.5px] font-semibold text-slate-800">
                  Click to upload or drag and drop
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  PDF, JPG, PNG (Max size: 10 MB)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Uploaded List */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Attached Files
              </label>
              <div className="border border-slate-200 rounded-xl p-3 min-h-[96px] flex flex-col justify-center">
                {documents.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto scroll-thin">
                    {documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg text-[11.5px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <File size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate text-slate-800 font-medium">{doc.name}</span>
                          <span className="text-slate-400 shrink-0">({doc.sizeKb} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-[12px] py-4">
                    <File size={16} className="opacity-50" />
                    <span>No documents attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Verification & Remarks */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[12px] font-bold flex items-center justify-center">
              5
            </div>
            <h2 className="text-[14px] font-bold text-slate-900">Verification & Remarks</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Verification Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OtherDocStatus)}
                  className="w-full h-8.5 px-3 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none font-medium"
                >
                  <option value="Verified">Verified</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Action Required">Action Required</option>
                  <option value="Expired">Expired</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                Verified By Staff <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className="w-full h-8.5 px-3 pr-8 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] appearance-none"
                >
                  <option value="Paras Dubey">Paras Dubey</option>
                  <option value="Meera Iyer">Meera Iyer</option>
                  <option value="Paras Dubey">Paras Dubey</option>
                  <option value="Rahul Patil">Rahul Patil</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
              Remark
            </label>
            <textarea
              value={remark}
              maxLength={500}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter remarks or legal notes (optional)..."
              rows={3}
              className="w-full px-3 py-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0066FF] resize-none"
            />
            <div className="text-right text-[11px] text-slate-400 mt-0.5">
              {remark.length}/500
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/legal/other-documents')}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-[13px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Cancel
          </button>

          <button
            type="submit"
            disabled={!canSave}
            title={canSave ? undefined : 'Your role cannot save Legal records'}
            className="h-9 px-6 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Check size={15} /> Submit
          </button>
        </div>
      </form>
    </div>
  )
}
