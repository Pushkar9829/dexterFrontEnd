import { useState, useMemo, useRef, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  Upload,
  ShieldCheck,
  FileText,
  FileCheck,
  Building2,
  User,
  CheckCircle2,
  X,
  FileUp,
  CreditCard,
  Calendar,
  Layers,
  ArrowLeft,
  ExternalLink,
  Eye,
  Check,
} from 'lucide-react'
import { useFranchises, type Franchise } from '@/data/franchises'
import { addKycCase, useKycCases, type KycCase, type KycDoc } from '@/data/kyc'
import { toast } from '@/components/ui/Toast'

interface UploadedDocState {
  file: File | null
  fileName: string
  fileSizeKb: number
  uploadedAt: string
}

export default function KycUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paramFrId = searchParams.get('franchiseId')

  const franchises = useFranchises()
  const existingCases = useKycCases()

  // Select franchise
  const [selectedFrId, setSelectedFrId] = useState<string>(() => {
    if (paramFrId && franchises.some((f) => f.id === paramFrId)) {
      return paramFrId
    }
    const pendingFr = franchises.find((f) => f.kyc === 'Pending' || f.kyc === 'In review')
    return pendingFr?.id || franchises[0]?.id || ''
  })

  const selectedFr = useMemo<Franchise | undefined>(() => {
    return franchises.find((f) => f.id === selectedFrId)
  }, [franchises, selectedFrId])

  // Form Fields
  const [applicantName, setApplicantName] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [aadhaarLast4, setAadhaarLast4] = useState('')
  const [entityType, setEntityType] = useState('Proprietorship')
  const [fatherName, setFatherName] = useState('')
  const [dob, setDob] = useState('1988-06-15')
  const [address, setAddress] = useState('')
  const [gstin, setGstin] = useState('')
  const [bankName, setBankName] = useState('State Bank of India')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // Auto-populate when selected franchise changes
  const [prevFrId, setPrevFrId] = useState('')
  if (selectedFr && selectedFr.id !== prevFrId) {
    setPrevFrId(selectedFr.id)
    setApplicantName(selectedFr.owner || selectedFr.name)
    setAddress(`${selectedFr.city}, ${selectedFr.state}`)
    // check if existing case has fields
    const prevCase = existingCases.find((c) => c.franchiseId === selectedFr.id)
    if (prevCase) {
      setPanNumber(prevCase.fields.pan || '')
      setAadhaarLast4(prevCase.fields.aadhaarLast4 || '')
      setEntityType(prevCase.fields.entityType || 'Proprietorship')
      setFatherName(prevCase.fields.fatherName || '')
      setDob(prevCase.fields.dob || '1988-06-15')
      setAddress(prevCase.fields.address || `${selectedFr.city}, ${selectedFr.state}`)
    }
  }

  // Uploaded files map: docKey -> UploadedDocState
  const [docs, setDocs] = useState<Record<string, UploadedDocState>>({})

  const handleFileUpload = (docKey: string, file: File) => {
    setDocs((prev) => ({
      ...prev,
      [docKey]: {
        file,
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        uploadedAt: new Date().toISOString(),
      },
    }))
    toast(`Uploaded: ${file.name}`)
  }

  const handleRemoveDoc = (docKey: string) => {
    setDocs((prev) => {
      const next = { ...prev }
      delete next[docKey]
      return next
    })
  }

  // Submit Handler
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successModal, setSuccessModal] = useState<{ open: boolean; caseId: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFr) {
      toast('Please select a franchise entity', 'error')
      return
    }

    if (!applicantName.trim()) {
      toast('Please enter applicant name', 'error')
      return
    }

    if (!panNumber.trim() && !docs['pan']) {
      toast('Please provide a PAN number or upload a PAN card', 'error')
      return
    }

    if (!confirmed) {
      toast('Please confirm the document authentication declaration', 'error')
      return
    }

    setIsSubmitting(true)

    // Build new KYC case
    const now = new Date().toISOString()
    const newCaseId = `FR-APP-${Math.floor(1000 + Math.random() * 9000)}`

    const docItems: KycDoc[] = [
      {
        type: 'PAN Card',
        checked: false,
        versions: [
          {
            v: 1,
            file: docs['pan']?.fileName || `PAN_${panNumber.toUpperCase() || 'SCAN'}.pdf`,
            at: now,
            by: applicantName,
          },
        ],
      },
      {
        type: 'Aadhaar',
        checked: false,
        versions: [
          {
            v: 1,
            file: docs['aadhaar']?.fileName || `Aadhaar_${aadhaarLast4 || 'UID'}.pdf`,
            at: now,
            by: applicantName,
          },
        ],
      },
      {
        type: 'Rent Agreement',
        checked: false,
        versions: [
          {
            v: 1,
            file: docs['rent']?.fileName || `Rent_Agreement_${selectedFr.city}.pdf`,
            at: now,
            by: applicantName,
          },
        ],
      },
    ]

    const newCase: KycCase = {
      id: newCaseId,
      franchiseId: selectedFr.id,
      applicant: selectedFr.name,
      loi: `LOI-${selectedFr.state.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      region: `${selectedFr.city}, ${selectedFr.state}`,
      status: 'Under Verification',
      docs: docItems,
      fields: {
        pan: (panNumber || 'ABCDE1234F').toUpperCase(),
        entityType,
        nameOnPan: applicantName,
        fatherName: fatherName || 'Mahesh Agarwal',
        dob,
        aadhaarLast4: aadhaarLast4 || '4826',
        address,
      },
      note: note.trim()
        ? `${note}\n[Uploaded GST: ${gstin || 'N/A'}, Bank: ${bankName} A/C: ${accountNumber || 'N/A'}]`
        : `Uploaded via KYC Ingestion Portal. Bank: ${bankName}`,
      checklist: {
        panActive: false,
        aadhaarConsent: true,
        addressLegible: true,
        rentValid: Boolean(docs['rent']),
      },
      api: { at: now, nameMatch: 95 },
      submittedAt: now,
    }

    setTimeout(() => {
      addKycCase(newCase)
      setIsSubmitting(false)
      toast(`KYC Package for ${selectedFr.id} submitted successfully!`)
      setSuccessModal({ open: true, caseId: newCaseId })
    }, 400)
  }

  // File Dropzone Component
  const DropZone = ({
    docKey,
    title,
    required = false,
    hint = 'PDF, JPG or PNG up to 10MB',
  }: {
    docKey: string
    title: string
    required?: boolean
    hint?: string
  }) => {
    const fileRef = useRef<HTMLInputElement>(null)
    const current = docs[docKey]

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
            <FileText size={15} className="text-[#0066FF]" />
            {title}
            {required && <span className="text-red-500 text-xs">*</span>}
          </span>
          {current && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              <Check size={11} strokeWidth={3} /> Ready
            </span>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0]
            if (f) handleFileUpload(docKey, f)
          }}
        />

        {current ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px]">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck size={16} className="text-[#0066FF] shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-slate-800 truncate">{current.fileName}</p>
                <p className="text-[10px] text-slate-400">{current.fileSizeKb} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[11px] text-[#0066FF] hover:underline px-1.5 py-0.5 rounded cursor-pointer"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => handleRemoveDoc(docKey)}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-[#0066FF] rounded-lg cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#0066FF] mb-1.5">
              <FileUp size={16} />
            </div>
            <span className="text-[12px] font-semibold text-slate-800">
              Click to browse or drag & drop
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">{hint}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-12 max-w-[1400px]">
      {/* Breadcrumb matching EmployeeList: Workspace > Onboarding > KYC Management > Upload */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/onboarding" className="hover:text-[#0066FF] transition-colors">
          Onboarding
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <Link to="/kyc" className="hover:text-[#0066FF] transition-colors">
          KYC Management
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Upload Documents</span>
      </div>

      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
            KYC Document Upload
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Ingest and verify identification, business registrations, premises agreements, and bank details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/kyc/verification')}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ShieldCheck size={14} className="text-[#0066FF]" />
            <span>Verification Queue</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/kyc')}
            className="inline-flex items-center gap-1.5 h-9.5 px-3.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} className="text-slate-400" />
            <span>Back to Hub</span>
          </button>
        </div>
      </div>

      {/* Top Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-[76px] rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#0066FF] shrink-0">
            <Upload size={20} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Intake Mode</div>
            <div className="text-[14px] font-bold text-slate-900">Direct Queue Ingestion</div>
          </div>
        </div>

        <div className="h-[76px] rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Compliance Target</div>
            <div className="text-[14px] font-bold text-slate-900">RBI & Bank Guidelines</div>
          </div>
        </div>

        <div className="h-[76px] rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Verification SLA</div>
            <div className="text-[14px] font-bold text-slate-900">24 – 48 Business Hours</div>
          </div>
        </div>

        <div className="h-[76px] rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Accepted Formats</div>
            <div className="text-[14px] font-bold text-slate-900">PDF, JPG, PNG (Max 10MB)</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Franchise Selection Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                1. Select Franchise Entity
              </h2>
              <p className="text-[12px] text-slate-500">
                Choose the registered franchise partner for whom documents are being uploaded.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Franchise Partner
              </label>
              <select
                value={selectedFrId}
                onChange={(e) => setSelectedFrId(e.target.value)}
                className="w-full h-10 px-3 text-[13px] font-medium rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              >
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} — {f.name} ({f.tier} · {f.city}, {f.state} · KYC: {f.kyc})
                  </option>
                ))}
              </select>
            </div>

            {selectedFr && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-200 text-[#0066FF] font-bold text-[13px] flex items-center justify-center shrink-0">
                  {selectedFr.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-[13px] truncate">
                    {selectedFr.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedFr.tier} · {selectedFr.city}
                  </div>
                  <div className="text-[10px] text-slate-400">Owner: {selectedFr.owner}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Applicant & Identity Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                2. Applicant & Representative Information
              </h2>
              <p className="text-[12px] text-slate-500">
                Primary authorized signatory identity details for OCR verification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Applicant Name (as per PAN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Sharma"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              >
                <option value="Proprietorship">Proprietorship</option>
                <option value="Partnership">Partnership</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Individual">Individual</option>
                <option value="LLP">LLP</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Father's / Spouse's Name
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Mahesh Sharma"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Aadhaar (Last 4 Digits)
              </label>
              <input
                type="text"
                maxLength={4}
                value={aadhaarLast4}
                onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4826"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Registered Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No, Street, Landmark, City, State, PIN"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Document Upload Dropzones */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <FileUp size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                3. KYC Document Attachments
              </h2>
              <p className="text-[12px] text-slate-500">
                Upload clear, high-resolution scans or photos of the required verification files.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DropZone docKey="pan" title="PAN Card Scan" required hint="Color scan of front side" />
            <DropZone docKey="aadhaar" title="Aadhaar Card Scan" required hint="Front & Back (UIDAI masked acceptable)" />
            <DropZone docKey="rent" title="Rent Agreement / Deed" required hint="Registered lease copy or property deed" />
            <DropZone docKey="gst" title="GSTIN Certificate" hint="Form REG-06 or Trade License" />
            <DropZone docKey="cheque" title="Cancelled Cheque / Passbook" hint="Showing A/C number & IFSC clearly" />
            <DropZone docKey="electricity" title="Premises Electricity Bill" hint="Recent utility bill (under 90 days)" />
          </div>
        </div>

        {/* Step 4: Banking & GST Metadata */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                4. Bank Account & Tax Identifiers
              </h2>
              <p className="text-[12px] text-slate-500">
                Associated settlement account and tax registration numbers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 38291048592"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                maxLength={11}
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="SBIN0001234"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                GSTIN Number
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                className="w-full h-8.5 px-3 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF] uppercase font-mono"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Uploader Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any specific observations or comments for the compliance auditor..."
                className="w-full p-2.5 text-[12px] rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>
        </div>

        {/* Declaration & Submit Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-start gap-2.5 cursor-pointer max-w-2xl">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#0066FF] focus:ring-[#0066FF] border-slate-300"
            />
            <span className="text-[12px] text-slate-600 leading-snug">
              I certify that all uploaded identity and registration files have been cross-verified with original documents and are authentic copies.
            </span>
          </label>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/kyc')}
              className="px-4 h-9.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 h-9.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
            >
              <Upload size={15} />
              <span>{isSubmitting ? 'Submitting...' : 'Upload & Submit for Verification'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Recent KYC Queue Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-sm">
              <ShieldCheck size={16} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Recent KYC Intake Cases
            </h2>
          </div>
          <button
            onClick={() => navigate('/kyc/verification')}
            className="text-[12px] font-semibold text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Queue</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[11px] text-slate-700 border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#EEF4FC] text-slate-800 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap w-12">S.N.</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">Case ID</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">Franchise ID</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap text-left">Applicant</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">Region</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">Documents</th>
                <th className="py-2.5 px-3 border-r border-[#D9E5F5] whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky right-0 bg-[#EEF4FC] w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {existingCases.slice(0, 5).map((c, idx) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/30 text-center">
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-100 font-semibold text-[#0066FF]">
                    <button
                      onClick={() => navigate(`/kyc/verification/${c.id}`)}
                      className="hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      {c.id}
                      <ExternalLink size={10} className="opacity-60" />
                    </button>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100 font-medium">{c.franchiseId}</td>
                  <td className="py-2 px-3 border-r border-slate-100 font-semibold text-slate-900 text-left">
                    {c.applicant}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100">{c.region}</td>
                  <td className="py-2 px-3 border-r border-slate-100">
                    <span className="font-semibold text-slate-800">{c.docs.length} files</span>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-100">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${c.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.status === 'Resubmission requested'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-[#0066FF] border-blue-200'
                        }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 sticky right-0 bg-white">
                    <button
                      onClick={() => navigate(`/kyc/verification/${c.id}`)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#0066FF] bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Modal */}
      {successModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-[18px] font-bold text-slate-900">
                KYC Ingested Successfully!
              </h3>
              <p className="text-[13px] text-slate-500 mt-1">
                Case <span className="font-semibold text-slate-800">{successModal.caseId}</span> has been dispatched to the compliance verification queue.
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[12px] text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Franchise ID:</span>
                <span className="font-semibold text-slate-800">{selectedFr?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Applicant:</span>
                <span className="font-semibold text-slate-800">{applicantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-[#0066FF]">Under Verification</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(null)
                  navigate(`/kyc/verification/${successModal.caseId}`)
                }}
                className="inline-flex items-center gap-1.5 px-4 h-9.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[12px] font-semibold transition-all shadow-sm cursor-pointer"
              >
                <Eye size={14} />
                <span>Open in Verification Queue</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessModal(null)
                  setDocs({})
                  setPanNumber('')
                  setAadhaarLast4('')
                  setConfirmed(false)
                }}
                className="px-4 h-9.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-all cursor-pointer"
              >
                Upload Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
