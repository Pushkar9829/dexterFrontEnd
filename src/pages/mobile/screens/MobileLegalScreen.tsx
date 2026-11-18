import { useState, useRef } from 'react'
import {
  Scale,
  FileCheck,
  CreditCard,
  FileSignature,
  FileText,
  Bell,
  ArrowLeft,
  ChevronRight,
  Upload,
  Download,
  CheckCircle,
  FileKey,
  Plus,
  Eye,
  Landmark,
  X,
  Truck,
  Trash2,
  Building2
} from 'lucide-react'
import { CardCornerAccent } from '../components/CardCornerAccent'

interface MobileLegalScreenProps {
  onBackToMore: () => void
}

type LegalSub = 'list' | 'pvc' | 'kyc' | 'cheques' | 'agreement' | 'loi' | 'affidavit' | 'notice'

export interface MobileKycDocument {
  id: string
  docType: string
  customName?: string
  docNumber: string
  fileName: string
  fileSizeKb: number
  uploadedAt: string
  status: 'Verified' | 'Under Verification' | 'Uploaded' | 'Pending Review'
  verificationBadge?: string
  isMandatory?: boolean
  notes?: string
}

export const KYC_DOC_TYPES = [
  'Aadhaar Card (Front & Back)',
  'PAN Card',
  'Bank Cancelled Cheque / Passbook',
  'GSTIN Registration Certificate',
  'Electricity / Utility Bill (Address Proof)',
  'Shop Rent Agreement / Possession Letter',
  'Trade License / Shop Gumasta',
  'MSME / Udyam Certificate',
  'Voter ID Card',
  'Driving License',
  'Passport Copy',
  'Board Resolution / Authority Letter',
  'Other Document'
]

export interface MobileChequeItem {
  id: string
  sn: number
  chequeNumber: string
  bankName: string
  accountNumber: string
  allottedTo: 'Hitachi' | 'Dexter' | 'Bank' | 'Both'
  amount?: string
  status: 'Collected' | 'Under Clearing' | 'Verified' | 'Pending'
  purpose: string
  copyDocName?: string
  copyDocSize?: string
}

export interface ChequeCopyDocument {
  id: string
  name: string
  sizeKb: number
  chequeNumber: string
  uploadedAt: string
  type: string
}

export function MobileLegalScreen({ onBackToMore }: MobileLegalScreenProps) {
  const [activeSub, setActiveSub] = useState<LegalSub>('list')

  // KYC & Bank Details State (Docs can add or delete as per franchise availability)
  const [address] = useState('12, Main Market, Bewar')
  const [pincode] = useState('205301')
  const [state] = useState('Uttar Pradesh')
  const [city] = useState('Mainpuri')
  const [kycStatus] = useState('VERIFIED')

  // Bank Details State
  const [bankName] = useState('HDFC Bank')
  const [accountNumber] = useState('50200049182012')
  const [ifscCode] = useState('HDFC0001824')
  const [accountType] = useState('Current Account')
  const [beneficiaryName] = useState('Shree Ganesh Enterprises / Rohit Sharma')
  const [branchName] = useState('Bewar Branch, Mainpuri (UP)')

  // Dynamic KYC Documents collection (Add / Delete as per availability from franchise end)
  const [kycDocs, setKycDocs] = useState<MobileKycDocument[]>([
    {
      id: 'kyc-aadhaar',
      docType: 'Aadhaar Card (Front & Back)',
      docNumber: '5481 9283 1029',
      fileName: 'Aadhaar_Card_Front_Back.pdf',
      fileSizeKb: 840,
      uploadedAt: '10 Oct 2026',
      status: 'Verified',
      verificationBadge: 'Verified via UIDAI OTP',
      isMandatory: true,
      notes: 'Biometrically verified via Aadhaar OTP'
    },
    {
      id: 'kyc-pan',
      docType: 'PAN Card',
      docNumber: 'ABCDE1234F',
      fileName: 'PAN_Card_NSDL_Verified.pdf',
      fileSizeKb: 320,
      uploadedAt: '10 Oct 2026',
      status: 'Verified',
      verificationBadge: 'Verified against NSDL Database',
      isMandatory: true,
      notes: 'Matches entity name: Shree Ganesh Enterprises'
    },
    {
      id: 'kyc-bank',
      docType: 'Bank Cancelled Cheque / Passbook',
      docNumber: 'HDFC - 50200049182012',
      fileName: 'Cancelled_Cheque_HDFC.jpg',
      fileSizeKb: 480,
      uploadedAt: '12 Oct 2026',
      status: 'Verified',
      verificationBadge: 'Penny Drop Verified (100% Match)',
      isMandatory: true,
      notes: 'IFSC: HDFC0001824 • Current A/C'
    },
    {
      id: 'kyc-gst',
      docType: 'GSTIN Registration Certificate',
      docNumber: '09ABCDE1234F1Z5',
      fileName: 'GST_Reg_Certificate_09A.pdf',
      fileSizeKb: 650,
      uploadedAt: '11 Oct 2026',
      status: 'Verified',
      verificationBadge: 'Active Regular Taxpayer',
      isMandatory: false,
      notes: 'GSTIN state code 09 (Uttar Pradesh)'
    },
    {
      id: 'kyc-rent',
      docType: 'Shop Rent Agreement / Possession Letter',
      docNumber: 'Shop #12 Main Market, Bewar',
      fileName: 'Shop_Rent_Agreement_Signed.pdf',
      fileSizeKb: 1420,
      uploadedAt: '14 Oct 2026',
      status: 'Verified',
      verificationBadge: 'Premises Landlord Verified',
      isMandatory: false,
      notes: 'Valid lease tenure through Oct 2029'
    }
  ])

  // KYC Modal States
  const [isAddKycModalOpen, setIsAddKycModalOpen] = useState(false)
  const [newKycType, setNewKycType] = useState(KYC_DOC_TYPES[0])
  const [newKycCustomName, setNewKycCustomName] = useState('')
  const [newKycNumber, setNewKycNumber] = useState('')
  const [newKycNotes, setNewKycNotes] = useState('')
  const [newKycFile, setNewKycFile] = useState<File | null>(null)
  const [kycNotification, setKycNotification] = useState<string | null>(null)
  const kycModalFileInputRef = useRef<HTMLInputElement>(null)

  // Delete & Preview State
  const [deletingKycDoc, setDeletingKycDoc] = useState<MobileKycDocument | null>(null)
  const [previewingKycDoc, setPreviewingKycDoc] = useState<MobileKycDocument | null>(null)

  const handleAddKycDoc = (e: React.FormEvent) => {
    e.preventDefault()
    const isOther = newKycType === 'Other Document'
    const finalTitle = isOther ? (newKycCustomName.trim() || 'Custom Document') : newKycType

    const fileName = newKycFile?.name || `${finalTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Upload.pdf`
    const fileSizeKb = newKycFile ? Math.round(newKycFile.size / 1024) : 485

    const newDoc: MobileKycDocument = {
      id: `kyc-doc-${Date.now()}`,
      docType: finalTitle,
      customName: isOther ? newKycCustomName.trim() : undefined,
      docNumber: newKycNumber.trim() || 'DOC-' + Math.floor(100000 + Math.random() * 900000),
      fileName,
      fileSizeKb,
      uploadedAt: 'Today, Just now',
      status: 'Uploaded',
      verificationBadge: 'Uploaded by Franchise • Pending Review',
      notes: newKycNotes.trim() || 'Uploaded as per franchise end availability',
      isMandatory: false
    }

    setKycDocs((prev) => [newDoc, ...prev])
    setIsAddKycModalOpen(false)
    setNewKycType(KYC_DOC_TYPES[0])
    setNewKycCustomName('')
    setNewKycNumber('')
    setNewKycNotes('')
    setNewKycFile(null)

    setKycNotification(`"${finalTitle}" added to KYC documents as per franchise availability.`)
    setTimeout(() => setKycNotification(null), 4000)
  }

  const handleConfirmDeleteKycDoc = () => {
    if (!deletingKycDoc) return
    const docName = deletingKycDoc.docType
    setKycDocs((prev) => prev.filter((d) => d.id !== deletingKycDoc.id))
    setDeletingKycDoc(null)
    setKycNotification(`"${docName}" removed from KYC documents.`)
    setTimeout(() => setKycNotification(null), 4000)
  }

  // PVC State
  const [pvcIssueDate] = useState('12-01-2026')
  const [pvcExpiryDate] = useState('11-01-2027')
  const [pvcStatus] = useState('Verified by CRM Team')

  // Cheques Management Multi-Cheque State (01 to more)
  const [postalMethod] = useState('Speed Post')
  const [docketNo] = useState('EU992817291IN')
  const [podStatus] = useState('Delivered & Stored in Vault')
  const [podDate] = useState('16 Oct 2026')

  const [cheques, setCheques] = useState<MobileChequeItem[]>([
    {
      id: 'chq-1',
      sn: 1,
      chequeNumber: '449102',
      bankName: 'HDFC Bank',
      accountNumber: '50200049182012',
      allottedTo: 'Hitachi',
      amount: '₹2,50,000',
      status: 'Verified',
      purpose: 'Security Deposit Guarantee',
      copyDocName: 'Cheque_01_Copy_449102.pdf',
      copyDocSize: '420 KB'
    },
    {
      id: 'chq-2',
      sn: 2,
      chequeNumber: '449103',
      bankName: 'HDFC Bank',
      accountNumber: '50200049182012',
      allottedTo: 'Dexter',
      amount: '₹2,50,000',
      status: 'Collected',
      purpose: 'WLA ATM Cash Floating Security',
      copyDocName: 'Cheque_02_Copy_449103.pdf',
      copyDocSize: '385 KB'
    },
    {
      id: 'chq-3',
      sn: 3,
      chequeNumber: '449104',
      bankName: 'HDFC Bank',
      accountNumber: '50200049182012',
      allottedTo: 'Both',
      amount: '₹1,00,000',
      status: 'Verified',
      purpose: 'Operational SLA Reserve',
      copyDocName: 'Cheque_03_Copy_449104.pdf',
      copyDocSize: '410 KB'
    }
  ])

  const [chequeDocuments, setChequeDocuments] = useState<ChequeCopyDocument[]>([
    {
      id: 'doc-1',
      name: 'Cheque_01_Copy_449102.pdf',
      sizeKb: 420,
      chequeNumber: '449102',
      uploadedAt: '12 Oct 2026',
      type: 'application/pdf'
    },
    {
      id: 'doc-2',
      name: 'Cheque_02_Copy_449103.pdf',
      sizeKb: 385,
      chequeNumber: '449103',
      uploadedAt: '12 Oct 2026',
      type: 'application/pdf'
    },
    {
      id: 'doc-3',
      name: 'Cheque_03_Copy_449104.pdf',
      sizeKb: 410,
      chequeNumber: '449104',
      uploadedAt: '14 Oct 2026',
      type: 'application/pdf'
    }
  ])

  // Modals for Cheques
  const [previewingDoc, setPreviewingDoc] = useState<ChequeCopyDocument | null>(null)
  const [isAddChequeModalOpen, setIsAddChequeModalOpen] = useState(false)

  // New Cheque Form
  const [newChqNum, setNewChqNum] = useState('')
  const [newBankName, setNewBankName] = useState('HDFC Bank')
  const [newAccNum, setNewAccNum] = useState('50200049182012')
  const [newAllottedTo, setNewAllottedTo] = useState<'Hitachi' | 'Dexter' | 'Bank' | 'Both'>('Hitachi')
  const [newAmount, setNewAmount] = useState('250000')
  const [newPurpose, setNewPurpose] = useState('Security Deposit Guarantee')
  const newFileInputRef = useRef<HTMLInputElement>(null)
  const [newUploadedFileName, setNewUploadedFileName] = useState<string>('')

  const handleAddNewCheque = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChqNum.trim()) {
      alert('Please enter a cheque number')
      return
    }

    const nextSn = cheques.length + 1
    const padSn = nextSn < 10 ? `0${nextSn}` : `${nextSn}`
    const fileName = newUploadedFileName || `Cheque_${padSn}_Copy_${newChqNum.trim()}.pdf`

    const newChequeItem: MobileChequeItem = {
      id: `chq-${Date.now()}`,
      sn: nextSn,
      chequeNumber: newChqNum.trim(),
      bankName: newBankName.trim() || 'HDFC Bank',
      accountNumber: newAccNum.trim() || '50200049182012',
      allottedTo: newAllottedTo,
      amount: newAmount ? `₹${Number(newAmount).toLocaleString()}` : '₹2,50,000',
      status: 'Collected',
      purpose: newPurpose.trim() || 'Security Deposit Guarantee',
      copyDocName: fileName,
      copyDocSize: '390 KB'
    }

    const newDocItem: ChequeCopyDocument = {
      id: `doc-${Date.now()}`,
      name: fileName,
      sizeKb: 390,
      chequeNumber: newChqNum.trim(),
      uploadedAt: 'Today',
      type: 'application/pdf'
    }

    setCheques([...cheques, newChequeItem])
    setChequeDocuments([...chequeDocuments, newDocItem])
    setIsAddChequeModalOpen(false)
    setNewChqNum('')
    setNewUploadedFileName('')
    alert(`Cheque ${padSn} (#${newChqNum.trim()}) and its Cheque Copy document added successfully!`)
  }

  const handleFileUploadDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewUploadedFileName(file.name)
    }
  }

  const handleQuickUploadCopy = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const nextSn = cheques.length + 1
      const padSn = nextSn < 10 ? `0${nextSn}` : `${nextSn}`
      const newDoc: ChequeCopyDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        sizeKb: Math.round(file.size / 1024) || 350,
        chequeNumber: `CHQ-${padSn}`,
        uploadedAt: 'Today',
        type: file.type || 'application/pdf'
      }
      setChequeDocuments((prev) => [...prev, newDoc])
      alert(`Cheque Copy document "${file.name}" uploaded successfully!`)
    }
  }

  const submodules = [
    { id: 'pvc' as LegalSub, title: 'PVC', icon: FileCheck, desc: 'Police Verification Certificate & validity' },
    { id: 'kyc' as LegalSub, title: 'KYC', icon: CreditCard, desc: 'Aadhaar, PAN, GSTIN & biometric verification' },
    { id: 'cheques' as LegalSub, title: 'Cheques', icon: FileKey, desc: 'Cheque submission, postal method & docket' },
    { id: 'agreement' as LegalSub, title: 'Agreement', icon: FileSignature, desc: 'Franchise master agreements per site' },
    { id: 'loi' as LegalSub, title: 'LOI', icon: FileText, desc: 'Letter of Intent download & signed copy upload' },
    { id: 'affidavit' as LegalSub, title: 'Affidavite', icon: Scale, desc: 'E-Stamp legal affidavits & notary verification' },
    { id: 'notice' as LegalSub, title: 'Notice', icon: Bell, desc: 'Official compliance circulars & notices' }
  ]

  if (activeSub === 'list') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        {/* Banner matching 10.26.38 PM.jpeg */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMore}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-semibold">
                <Scale size={14} />
                <span>Statutory Compliance</span>
              </div>
              <h1 className="text-xl font-black text-white">Legal</h1>
            </div>
          </div>
          <span className="rounded-xl bg-white/20 px-2.5 py-1 text-xs font-bold text-white border border-white/20">
            7 Documents
          </span>
        </div>

        {/* 7 Full-width Submodule Cards matching screenshot */}
        <div className="space-y-2.5">
          {submodules.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSub(item.id)}
                className="group relative flex w-full items-center justify-between rounded-2xl border border-blue-200/90 bg-white p-3.5 shadow-xs hover:border-blue-400 hover:shadow-md active:scale-[0.99] transition-all overflow-hidden text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 group-hover:bg-blue-100 transition-colors">
                    <Icon size={24} className="text-[#0C3E98] stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2A6B] group-hover:text-blue-700">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-blue-600">
                  <ChevronRight size={18} />
                </div>

                <CardCornerAccent />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // KYC Screen (Franchise KYC Docs can add or delete as per availability)
  if (activeSub === 'kyc') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3 animate-in fade-in">
        {/* Banner */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 active:scale-95"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-bold text-base leading-tight">KYC / Bank Details</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
              {kycStatus}
            </span>
            <span className="rounded-full bg-white/20 text-white border border-white/30 px-2 py-0.5 text-[10px] font-bold">
              {kycDocs.length} Docs
            </span>
          </div>
        </div>

        {/* Dynamic Notification Toast */}
        {kycNotification && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-600 shrink-0" />
              <span className="font-semibold text-[11px]">{kycNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setKycNotification(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
            >
              <X size={13} />
            </button>
          </div>
        )}


        {/* Primary Bank Account Card */}
        <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div className="flex items-center gap-1.5">
              <Landmark size={15} className="text-blue-600" />
              <h3 className="text-xs font-black text-[#0B2A6B]">Primary Bank Account</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
              <CheckCircle size={10} /> Penny Drop Verified
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Bank Name</span>
              <span className="font-bold text-slate-800">{bankName}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Account Type</span>
              <span className="font-bold text-slate-800">{accountType}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Account Number</span>
              <span className="font-mono font-bold text-blue-700">{accountNumber}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">IFSC Code</span>
              <span className="font-mono font-bold text-slate-800">{ifscCode}</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
            <span className="text-[10px] text-slate-400 font-semibold block">Beneficiary / Account Holder</span>
            <span className="font-bold text-slate-800 block truncate">{beneficiaryName}</span>
            <span className="text-[9.5px] text-slate-500 block mt-0.5 truncate">{branchName}</span>
          </div>
        </div>

        {/* KYC Documents Section (Add / Delete as per availability) */}
        <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <FileCheck size={15} className="text-blue-600" />
                <h3 className="text-xs font-black text-[#0B2A6B]">
                  KYC Documents ({kycDocs.length})
                </h3>
              </div>
              <p className="text-[10px] text-slate-400">Add or delete as per franchise availability</p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddKycModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
            >
              <Plus size={12} /> Add KYC Doc
            </button>
          </div>

          {/* Empty State */}
          {kycDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center space-y-2 bg-slate-50/60">
              <FileText size={24} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">No KYC Documents Available</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">
                Documents can be uploaded based on availability from the franchise end.
              </p>
              <button
                type="button"
                onClick={() => setIsAddKycModalOpen(true)}
                className="mt-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                + Add First KYC Document
              </button>
            </div>
          ) : (
            /* Documents List */
            <div className="space-y-2.5">
              {kycDocs.map((doc) => {
                const isVerified = doc.status === 'Verified'
                const isUploaded = doc.status === 'Uploaded'

                return (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2 hover:border-blue-300 transition-all shadow-2xs"
                  >
                    {/* Header: Doc Name + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {doc.docType}
                        </span>
                        {doc.isMandatory && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                            Required
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${isVerified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isUploaded
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    {/* Doc Number / ID */}
                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-100 text-[11px]">
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-semibold block">
                          Document / Ref Number
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {doc.docNumber}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9.5px] text-slate-400 font-semibold block">
                          Uploaded
                        </span>
                        <span className="text-slate-600 font-medium text-[10.5px]">
                          {doc.uploadedAt}
                        </span>
                      </div>
                    </div>

                    {/* File Attachment & Note */}
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <FileText size={13} className="text-blue-600 shrink-0" />
                        <span className="font-medium truncate">{doc.fileName}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">({doc.fileSizeKb} KB)</span>
                      </div>

                      {doc.verificationBadge && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                          <CheckCircle size={11} className="shrink-0" />
                          <span className="truncate">{doc.verificationBadge}</span>
                        </div>
                      )}

                      {doc.notes && (
                        <p className="text-[10px] text-slate-500 italic truncate">
                          "{doc.notes}"
                        </p>
                      )}
                    </div>

                    {/* Action Bar: View & Delete as per Franchise Availability */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => setPreviewingKycDoc(doc)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10.5px] border border-blue-200 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Eye size={12} /> View Document
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingKycDoc(doc)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10.5px] border border-red-200 flex items-center gap-1 active:scale-95 transition-all"
                        title="Delete document as per franchise availability"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Registered Address */}
        <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-100">
            <Building2 size={14} className="text-blue-600" />
            <h3 className="text-xs font-black text-[#0B2A6B]">Registered Franchise Address</h3>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Registered Address</label>
            <input
              type="text"
              readOnly
              value={address}
              className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-800 text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">PIN Code</label>
              <input
                type="text"
                readOnly
                value={pincode}
                className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 font-mono font-bold text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">State</label>
              <input
                type="text"
                readOnly
                value={state}
                className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 font-semibold text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">City</label>
              <input
                type="text"
                readOnly
                value={city}
                className="w-full h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 font-semibold text-xs"
              />
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
          <span className="text-[11px] font-black text-emerald-800 block">
            VERIFICATION STATUS: ACTIVE & VERIFIED
          </span>
        </div>

        {/* ======================================================== */}
        {/* ADD KYC DOCUMENT MODAL */}
        {/* ======================================================== */}
        {isAddKycModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-4 py-3 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Add KYC Document</h4>
                  <p className="text-[10px] text-blue-100">Upload as per availability at franchise end</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddKycModalOpen(false)}
                  className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddKycDoc} className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
                {/* Document Type Dropdown */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newKycType}
                    onChange={(e) => setNewKycType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {KYC_DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Title if Other */}
                {newKycType === 'Other Document' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Custom Document Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shop Possession Certificate"
                      value={newKycCustomName}
                      onChange={(e) => setNewKycCustomName(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 px-3 font-medium text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Document / Registration / ID Number */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Document / ID / Certificate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12-digit Aadhaar / 10-digit PAN / Reg No"
                    value={newKycNumber}
                    onChange={(e) => setNewKycNumber(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 font-mono font-medium text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* File Upload Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Upload Document File (PDF / Image) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    ref={kycModalFileInputRef}
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setNewKycFile(e.target.files[0])
                      }
                    }}
                  />

                  <div
                    onClick={() => kycModalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-3 text-center bg-blue-50/40 cursor-pointer transition-all"
                  >
                    <Upload size={20} className="mx-auto text-blue-600 mb-1" />
                    {newKycFile ? (
                      <div>
                        <span className="font-bold text-blue-800 text-xs block truncate">{newKycFile.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {Math.round(newKycFile.size / 1024)} KB • Click to change file
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-slate-700 text-xs block">Choose File or Take Photo</span>
                        <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks / Notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Franchise Remark / Availability Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Self-attested copy provided by franchise"
                    value={newKycNotes}
                    onChange={(e) => setNewKycNotes(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 font-medium text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddKycModalOpen(false)}
                    className="flex-1 h-9 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Add Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* DELETE KYC DOCUMENT CONFIRMATION MODAL */}
        {/* ======================================================== */}
        {deletingKycDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl border border-slate-200 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Delete KYC Document?</h4>
                  <p className="text-[11px] text-slate-500">Unlink as per franchise availability</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document:</span>
                  <span className="font-bold text-slate-900">{deletingKycDoc.docType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref / Number:</span>
                  <span className="font-mono font-bold text-slate-800">{deletingKycDoc.docNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File:</span>
                  <span className="truncate max-w-[170px] text-slate-600 font-medium">{deletingKycDoc.fileName}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Are you sure you want to remove this document from the franchise KYC records? You can upload it again anytime if available later.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingKycDoc(null)}
                  className="flex-1 h-9 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteKycDoc}
                  className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} /> Delete Document
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PREVIEW KYC DOCUMENT MODAL */}
        {/* ======================================================== */}
        {previewingKycDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-4 py-3 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black">{previewingKycDoc.docType}</h4>
                  <p className="text-[10px] text-blue-100 truncate max-w-[220px]">{previewingKycDoc.fileName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingKycDoc(null)}
                  className="h-6 w-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs">
                {/* Document Simulation Box */}
                <div className="rounded-xl border-2 border-blue-200 bg-slate-50 p-3 text-center space-y-2 relative overflow-hidden">
                  <div className="h-10 w-10 mx-auto rounded-xl bg-blue-100 text-[#0C3E98] flex items-center justify-center">
                    <FileText size={22} />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-800 text-sm block">
                      {previewingKycDoc.docNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      {previewingKycDoc.fileName} • {previewingKycDoc.fileSizeKb} KB
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <CheckCircle size={12} /> {previewingKycDoc.verificationBadge || 'Document Verified'}
                  </div>

                  {previewingKycDoc.notes && (
                    <p className="text-[10.5px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200 text-left">
                      <span className="font-bold text-slate-700">Note:</span> {previewingKycDoc.notes}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Uploaded Date</span>
                    <span className="font-bold text-slate-800">{previewingKycDoc.uploadedAt}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Status</span>
                    <span className="font-bold text-emerald-600">{previewingKycDoc.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => alert(`Downloading ${previewingKycDoc.fileName}...`)}
                    className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Download size={13} /> Download Doc
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewingKycDoc(null)}
                    className="px-4 h-9 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // PVC Screen
  if (activeSub === 'pvc') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="font-bold text-base">Police Verification (PVC)</h2>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Issue Date</span>
              <span className="font-bold text-slate-800">{pvcIssueDate}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Expiry Date</span>
              <span className="font-bold text-slate-800">{pvcExpiryDate}</span>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-800 block">Current Status</span>
              <span className="text-[10px] text-emerald-600">{pvcStatus}</span>
            </div>
            <button
              onClick={() => alert('Downloading Police Verification Certificate')}
              className="text-xs font-bold text-blue-600 underline"
            >
              View Document
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
            <Upload size={20} className="mx-auto text-blue-600 mb-1" />
            <p className="text-[11px] font-bold text-slate-700">Upload New Annual PVC Certificate</p>
            <button
              onClick={() => alert('PVC file upload dialog')}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px]"
            >
              Upload PDF
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Cheques Screen
  if (activeSub === 'cheques') {
    return (
      <div className="space-y-4 pb-6 pt-3 px-3 animate-in fade-in">
        {/* Banner */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSub('list')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 active:scale-95"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-bold text-base leading-tight">Cheques Management</h2>
              <p className="text-[10px] text-blue-100">Franchise Security Cheques & Document Scans</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-extrabold border border-white/30">
            {cheques.length} Cheques Linked
          </span>
        </div>

        {/* Dispatch & POD Tracking Card */}
        <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck size={14} className="text-blue-600" /> Dispatch & Vault Custody
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
              {podStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Postal Method</span>
              <span className="font-bold text-slate-800">{postalMethod}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5">POD: {podDate}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block">Docket Number</span>
              <span className="font-bold font-mono text-blue-700">{docketNo}</span>
            </div>
          </div>
        </div>

        {/* Section 1: CHEQUES DETAILS (01 to More) */}
        <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div className="flex items-center gap-1.5">
              <Landmark size={15} className="text-blue-600" />
              <h3 className="text-xs font-black text-[#0B2A6B]">
                Cheques Details ({cheques.length} {cheques.length === 1 ? 'Cheque' : 'Cheques'})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddChequeModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
            >
              <Plus size={12} /> Add Cheque
            </button>
          </div>

          {/* Cheque Cards List (01 to More) */}
          <div className="space-y-2.5">
            {cheques.map((c, idx) => {
              const padIndex = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`
              const linkedDoc = chequeDocuments.find((d) => d.chequeNumber === c.chequeNumber)

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2 hover:border-blue-300 transition-all shadow-2xs"
                >
                  {/* Cheque Header: Index Badge + Cheque Number + Allotted To */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-5 px-1.5 rounded-md bg-[#0C3E98] text-white text-[10px] font-black flex items-center justify-center">
                        Cheque {padIndex}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-800">
                        #{c.chequeNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                        Allotted: {c.allottedTo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                        {c.status}
                      </span>
                    </div>
                  </div>

                  {/* Bank & Account */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white rounded-lg p-2 border border-slate-100">
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-semibold block">Bank</span>
                      <span className="font-bold text-slate-700">{c.bankName}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-semibold block">Account No</span>
                      <span className="font-mono font-bold text-slate-700">{c.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-semibold block">Cheque Amount</span>
                      <span className="font-bold text-slate-800">{c.amount || '₹2,50,000'}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-semibold block">Purpose</span>
                      <span className="font-semibold text-slate-600 truncate block">{c.purpose}</span>
                    </div>
                  </div>

                  {/* Cheque Copy Document Preview Chip */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 truncate pr-2">
                      <FileText size={13} className="text-blue-600 shrink-0" />
                      <span className="font-medium truncate">{c.copyDocName || `Cheque_${padIndex}_Copy.pdf`}</span>
                      <span className="text-[10px] text-slate-400">({c.copyDocSize || '420 KB'})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewingDoc(
                          linkedDoc || {
                            id: `doc-${c.id}`,
                            name: c.copyDocName || `Cheque_${padIndex}_Copy.pdf`,
                            sizeKb: 420,
                            chequeNumber: c.chequeNumber,
                            uploadedAt: '12 Oct 2026',
                            type: 'application/pdf'
                          }
                        )
                      }
                      className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10.5px] border border-blue-200 flex items-center gap-1 shrink-0"
                    >
                      <Eye size={11} /> View Copy
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 2: CHEQUE COPIES AS DOCUMENTS */}
        <div className="rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <FileSignature size={15} className="text-blue-600" />
                <h3 className="text-xs font-black text-[#0B2A6B]">
                  Cheque Copy Documents ({chequeDocuments.length})
                </h3>
              </div>
              <p className="text-[10px] text-slate-400">Scanned PDFs & images of submitted cheques</p>
            </div>

            <div>
              <input
                type="file"
                ref={newFileInputRef}
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleQuickUploadCopy}
              />
              <button
                type="button"
                onClick={() => newFileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 text-[11px] font-bold hover:bg-blue-100 flex items-center gap-1"
              >
                <Upload size={12} /> Upload Copy
              </button>
            </div>
          </div>

          {/* Document list */}
          <div className="space-y-2">
            {chequeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white text-xs transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-800 text-[11.5px] truncate">{doc.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{doc.sizeKb} KB</span>
                      <span>•</span>
                      <span className="font-mono text-blue-700 font-bold">Chq #{doc.chequeNumber}</span>
                      <span>•</span>
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewingDoc(doc)}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    title="View Cheque Copy Document"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alert(`Downloading ${doc.name}...`)}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    title="Download document"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHEQUE COPY DOCUMENT PREVIEW MODAL */}
        {previewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-3.5 py-2.5 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black">Cheque Copy Document Viewer</h4>
                  <p className="text-[10px] text-blue-100 truncate max-w-[220px]">{previewingDoc.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingDoc(null)}
                  className="h-6 w-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="p-3.5 space-y-3">
                {/* Simulated Scanned Cheque View */}
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/30 p-3 text-[11px] font-sans relative overflow-hidden shadow-sm">
                  {/* Diagonal Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-25deg]">
                    <span className="text-2xl font-black text-slate-800 tracking-wider">
                      SECURITY DEPOSIT • NOT NEGOTIABLE
                    </span>
                  </div>

                  {/* Bank Header */}
                  <div className="flex justify-between items-start border-b border-emerald-200 pb-1.5">
                    <div>
                      <span className="font-extrabold text-xs text-[#0C3E98] block">HDFC BANK</span>
                      <span className="text-[9px] text-slate-500">BEWAR BRANCH, MAINPURI (UP) • IFSC: HDFC0001824</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8.5px] text-slate-400 block">VALID FOR 3 MONTHS</span>
                      <span className="font-mono font-bold text-[10px] border border-slate-300 bg-white px-1.5 py-0.5 rounded">
                        12-10-2026
                      </span>
                    </div>
                  </div>

                  {/* Payee & Amount */}
                  <div className="py-2 space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="text-[10px] text-slate-400 font-semibold">PAY:</span>
                      <span className="font-bold underline">HITACHI PAYMENT SERVICES / DEXTER INDIA</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="text-[10px] text-slate-400 font-semibold">RUPEES:</span>
                      <span className="font-medium italic">Two Lakh Fifty Thousand Only</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-mono text-[10px] text-slate-500">A/C: 50200049182012</span>
                      <div className="px-2 py-0.5 rounded border border-slate-300 bg-white font-mono font-bold text-xs text-slate-800">
                        ₹ 2,50,000/-
                      </div>
                    </div>
                  </div>

                  {/* Cheque MICR Band */}
                  <div className="mt-2 pt-1 border-t border-dashed border-emerald-300 font-mono text-center text-[10px] text-slate-600 tracking-widest bg-white/70 py-1 rounded">
                    ⑈ {previewingDoc.chequeNumber} ⑈ 110240015 ⑆ 004918 ⑈ 29
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Linked Cheque: <strong className="text-slate-800 font-mono">#{previewingDoc.chequeNumber}</strong></span>
                  <span>Size: <strong className="text-slate-800">{previewingDoc.sizeKb} KB</strong></span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Downloading document ${previewingDoc.name}`)}
                  className="flex-1 h-9 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewingDoc(null)}
                  className="flex-1 h-9 rounded-xl bg-slate-800 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD NEW CHEQUE MODAL */}
        {isAddChequeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0C3E98] to-[#1453CA] px-4 py-3 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black">Add Cheque (Cheque 0{cheques.length + 1})</h4>
                  <p className="text-[10px] text-blue-100">Attach cheque details & scanned copy document</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddChequeModalOpen(false)}
                  className="h-6 w-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <form onSubmit={handleAddNewCheque} className="p-4 space-y-3 text-xs">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    Cheque Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 449105"
                    value={newChqNum}
                    onChange={(e) => setNewChqNum(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Allotted To</label>
                    <select
                      value={newAllottedTo}
                      onChange={(e) => setNewAllottedTo(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 font-bold text-slate-800"
                    >
                      <option value="Hitachi">Hitachi</option>
                      <option value="Dexter">Dexter</option>
                      <option value="Bank">Bank</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Account No</label>
                    <input
                      type="text"
                      value={newAccNum}
                      onChange={(e) => setNewAccNum(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Purpose</label>
                  <input
                    type="text"
                    value={newPurpose}
                    onChange={(e) => setNewPurpose(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 font-medium text-slate-800"
                  />
                </div>

                {/* Upload Cheque Copy Document */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    Upload Cheque Copy Document (PDF / Image)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileUploadDoc}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                  />
                  {newUploadedFileName && (
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                      Attached: {newUploadedFileName}
                    </span>
                  )}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddChequeModalOpen(false)}
                    className="flex-1 h-9 rounded-xl border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
                  >
                    Add Cheque
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Generic document viewer for Agreement, LOI, Affidavit, Notice
  return (
    <div className="space-y-4 pb-6 pt-3 px-3">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0C3E98] to-[#1453CA] p-3 text-white">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveSub('list')}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-bold text-base uppercase">{activeSub}</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3 text-xs">
        <p className="text-slate-600">
          Official statutory documents mapped to your registered site IDs:
        </p>

        <div className="space-y-2">
          {['Site: 2014124545 (Bewar, Mainpuri)', 'Site: 2014124546 (Mainpuri City)'].map((siteName, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <span className="font-bold text-slate-800 block">{siteName}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Active Signed Copy</span>
              </div>
              <button
                onClick={() => alert(`Downloading ${activeSub.toUpperCase()} for ${siteName}`)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1"
              >
                <Download size={12} /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
