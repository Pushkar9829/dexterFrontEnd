import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Search,
  X,
  Landmark,
  FileText,
  CreditCard,
  Phone,
  Mail,
  User,
  Hash,
  BadgeCheck,
  Paperclip,
  Eye,
  Download,
  Trash2,
  RotateCcw,
  Save,
  ArrowRight,
  MapPin,
  Building2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'
import {
  getAccountMappingById,
  addAccountMapping,
  updateAccountMapping,
  type AccountMappingRecord,
  type MappingType,
  type UploadedDoc,
  type VendorKycItem,
} from '@/data/financeSettlementBank'

function TabSwitcher({
  current,
  onChange,
}: {
  current: MappingType
  onChange: (t: MappingType) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(['WLA', 'Axis Indent', 'ICICI'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition-all text-center ${current === t
              ? 'bg-[#0066FF] text-white shadow-sm'
              : 'bg-[#F0F5FA] text-slate-700 hover:bg-slate-200/80'
            }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

export default function SettlementAccountMappingForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { isReport } = useReportMode()
  const isEditing = Boolean(id && id !== 'new')

  // Active Tab: WLA | Axis Indent | ICICI
  const [activeTab, setActiveTab] = useState<MappingType>('WLA')

  // Common Header State
  const [atmId, setAtmId] = useState('XY2012312')
  const [hpyCode, setHpyCode] = useState('HPY-9921408')
  const [siteId, setSiteId] = useState('ST-MH-PUN-00124')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])

  // --- WLA Form States ---
  const [wlaNameAsPerBank, setWlaNameAsPerBank] = useState('')
  const [wlaBankName, setWlaBankName] = useState('ICICI Bank')
  const [wlaBankAccountNo, setWlaBankAccountNo] = useState('')
  const [wlaIfscCode, setWlaIfscCode] = useState('')
  const [wlaNameOnPan, setWlaNameOnPan] = useState('')
  const [wlaPanNo, setWlaPanNo] = useState('')
  const [wlaAadhaarMobile, setWlaAadhaarMobile] = useState('')
  const [wlaEmailId, setWlaEmailId] = useState('')
  const [wlaBranchSolId, setWlaBranchSolId] = useState('')
  const [wlaBankManagerName, setWlaBankManagerName] = useState('')
  const [wlaBankManagerMobile, setWlaBankManagerMobile] = useState('')
  const [wlaBankManagerEmail, setWlaBankManagerEmail] = useState('')

  // WLA Documents
  const [wlaDocType, setWlaDocType] = useState('Cancelled Cheque')
  const [wlaDocuments, setWlaDocuments] = useState<UploadedDoc[]>([
    { id: '1', docType: 'Cheque', fileName: 'cheque_xyz.pdf', uploadedOn: '19-10-2026' },
    { id: '2', docType: 'Bank Statement', fileName: 'statement_xyz.pdf', uploadedOn: '19-10-2026' },
    { id: '3', docType: 'PAN Card', fileName: 'pancard_xyz.pdf', uploadedOn: '19-10-2026' },
  ])

  // --- Axis / ICICI Indent Form States ---
  const [indentLocation, setIndentLocation] = useState('')
  const [indentFrName, setIndentFrName] = useState('')
  const [indentContact, setIndentContact] = useState('')
  const [indentEmail, setIndentEmail] = useState('')
  const [indentSolId, setIndentSolId] = useState('')
  const [indentAddressShortName, setIndentAddressShortName] = useState('')
  const [indentBranchAddress, setIndentBranchAddress] = useState('')
  const [indentCity, setIndentCity] = useState('')
  const [indentState, setIndentState] = useState('Uttar Pradesh')
  const [indentPincode, setIndentPincode] = useState('')
  const [indentIfscCode, setIndentIfscCode] = useState('')

  // KYC Vendor Table (3 persons x 2 documents each)
  const [vendorKycList, setVendorKycList] = useState<VendorKycItem[]>([
    { person: 'First Person', vendorName: '', docType: 'PAN Card', docRefNo: '' },
    { person: 'First Person', vendorName: '', docType: 'Aadhaar No.', docRefNo: '' },
    { person: 'Second Person', vendorName: '', docType: 'PAN Card', docRefNo: '' },
    { person: 'Second Person', vendorName: '', docType: 'Aadhaar No.', docRefNo: '' },
    { person: 'Third Person', vendorName: '', docType: 'PAN Card', docRefNo: '' },
    { person: 'Third Person', vendorName: '', docType: 'Aadhaar No.', docRefNo: '' },
  ])

  // Indent Documents & Remarks
  const [indentDocType, setIndentDocType] = useState('Cancelled Cheque Copy')
  const [indentDocuments, setIndentDocuments] = useState<UploadedDoc[]>([
    { id: 'doc-i1', docType: 'Cancelled Cheque Copy', fileName: 'cancelled_cheque.pdf', uploadedOn: '24-10-2026' },
    { id: 'doc-i2', docType: 'Bank Statement Copy', fileName: 'bank_statement.pdf', uploadedOn: '24-10-2026' },
  ])
  const [indentRemarks, setIndentRemarks] = useState('')

  // Load existing record if in edit mode
  useEffect(() => {
    if (isEditing && id) {
      const rec = getAccountMappingById(id)
      if (rec) {
        setActiveTab(rec.mappingType)
        setAtmId(rec.atmId || '')
        setHpyCode(rec.hpyCode || 'HPY-9921408')
        setSiteId(rec.siteId || '')
        setEffectiveDate(rec.effectiveDate || new Date().toISOString().split('T')[0])

        if (rec.mappingType === 'WLA') {
          setWlaNameAsPerBank(rec.nameAsPerBank || rec.franchiseeName || '')
          setWlaBankName(rec.bankName || 'ICICI Bank')
          setWlaBankAccountNo(rec.accountNumber || '')
          setWlaIfscCode(rec.ifscCode || '')
          setWlaNameOnPan(rec.nameOnPan || '')
          setWlaPanNo(rec.panNo || '')
          setWlaAadhaarMobile(rec.aadhaarLinkedMobile || rec.contact || '')
          setWlaEmailId(rec.emailId || '')
          setWlaBranchSolId(rec.branchSolId || '')
          setWlaBankManagerName(rec.bankManagerName || '')
          setWlaBankManagerMobile(rec.bankManagerMobile || '')
          setWlaBankManagerEmail(rec.bankManagerEmail || '')
          if (rec.documents && rec.documents.length > 0) {
            setWlaDocuments(rec.documents)
          }
        } else {
          setIndentFrName(rec.franchiseeName || '')
          setIndentContact(rec.contact || '')
          setIndentEmail(rec.emailId || '')
          setIndentLocation(rec.location || '')
          setIndentSolId(rec.solId || '')
          setIndentAddressShortName(rec.addressShortName || '')
          setIndentBranchAddress(rec.branchAddress || '')
          setIndentCity(rec.city || '')
          setIndentState(rec.state || 'Uttar Pradesh')
          setIndentPincode(rec.pincode || '')
          setIndentIfscCode(rec.ifscCode || '')
          setIndentRemarks(rec.remarks || '')
          if (rec.vendorKyc && rec.vendorKyc.length > 0) {
            setVendorKycList(rec.vendorKyc)
          }
          if (rec.documents && rec.documents.length > 0) {
            setIndentDocuments(rec.documents)
          }
        }
      }
    }
  }, [id, isEditing])

  // Document Upload Helper
  const handleSimulateUpload = (forTab: 'WLA' | 'Indent') => {
    const docName = forTab === 'WLA' ? wlaDocType : indentDocType
    const ext = docName.toLowerCase().includes('statement') ? 'pdf' : 'pdf'
    const cleanName = docName.toLowerCase().replace(/\s+/g, '_') + `_${Date.now().toString().slice(-4)}.${ext}`
    const newDoc: UploadedDoc = {
      id: Date.now().toString(),
      docType: docName,
      fileName: cleanName,
      uploadedOn: new Date().toISOString().split('T')[0],
    }

    if (forTab === 'WLA') {
      setWlaDocuments((prev) => [...prev, newDoc])
    } else {
      setIndentDocuments((prev) => [...prev, newDoc])
    }
    toast(`Uploaded: ${cleanName}`)
  }

  const handleDeleteDocument = (docId: string, forTab: 'WLA' | 'Indent') => {
    if (forTab === 'WLA') {
      setWlaDocuments((prev) => prev.filter((d) => d.id !== docId))
    } else {
      setIndentDocuments((prev) => prev.filter((d) => d.id !== docId))
    }
    toast('Document removed')
  }

  // Update vendor KYC item
  const handleUpdateVendorKyc = (index: number, field: keyof VendorKycItem, value: string) => {
    setVendorKycList((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Reset form
  const handleReset = () => {
    if (activeTab === 'WLA') {
      setWlaNameAsPerBank('')
      setWlaBankAccountNo('')
      setWlaIfscCode('')
      setWlaNameOnPan('')
      setWlaPanNo('')
      setWlaAadhaarMobile('')
      setWlaEmailId('')
      setWlaBranchSolId('')
      setWlaBankManagerName('')
      setWlaBankManagerMobile('')
      setWlaBankManagerEmail('')
    } else {
      setIndentLocation('')
      setIndentFrName('')
      setIndentContact('')
      setIndentEmail('')
      setIndentSolId('')
      setIndentAddressShortName('')
      setIndentBranchAddress('')
      setIndentCity('')
      setIndentPincode('')
      setIndentIfscCode('')
      setIndentRemarks('')
    }
    toast('Form fields reset')
  }

  // Save / Submit
  const handleSubmit = (isDraft: boolean) => {
    if (activeTab === 'WLA') {
      if (!atmId) {
        toast('Please enter ATM ID')
        return
      }
      if (!isDraft && (!wlaNameAsPerBank || !wlaBankAccountNo || !wlaIfscCode)) {
        toast('Please fill in required bank details (Name, Account No, IFSC)')
        return
      }

      const payload: Omit<AccountMappingRecord, 'id'> = {
        mappingType: 'WLA',
        atmId,
        siteId,
        franchiseeName: wlaNameAsPerBank || 'WLA Franchisee',
        contact: wlaAadhaarMobile,
        emailId: wlaEmailId,
        nameAsPerBank: wlaNameAsPerBank,
        bankName: wlaBankName,
        accountNumber: wlaBankAccountNo,
        ifscCode: wlaIfscCode,
        nameOnPan: wlaNameOnPan,
        panNo: wlaPanNo,
        aadhaarLinkedMobile: wlaAadhaarMobile,
        branchSolId: wlaBranchSolId,
        bankManagerName: wlaBankManagerName,
        bankManagerMobile: wlaBankManagerMobile,
        bankManagerEmail: wlaBankManagerEmail,
        documents: wlaDocuments,
        remarks: 'WLA settlement routing details saved',
        status: isDraft ? 'Draft' : 'Mapped',
        effectiveDate,
      }

      if (isEditing && id) {
        updateAccountMapping(id, payload)
        toast('WLA Account Mapping updated successfully!')
      } else {
        addAccountMapping(payload)
        toast('WLA Account Mapping created successfully!')
      }
    } else {
      // Axis Indent or ICICI
      if (!hpyCode && !atmId) {
        toast('Please enter HPY Code or ATM ID')
        return
      }
      if (!isDraft && (!indentSolId || !indentIfscCode)) {
        toast(`Please enter ${activeTab} SOL-ID and IFSC Code`)
        return
      }

      const payload: Omit<AccountMappingRecord, 'id'> = {
        mappingType: activeTab,
        atmId: atmId || 'DX-GEN-001',
        hpyCode,
        siteId,
        franchiseeName: indentFrName || 'Franchisee Partner',
        contact: indentContact,
        emailId: indentEmail,
        bankName: activeTab === 'Axis Indent' ? 'Axis Bank' : 'ICICI Bank',
        accountNumber: `9180200${Date.now().toString().slice(-6)}`,
        ifscCode: indentIfscCode,
        location: indentLocation,
        solId: indentSolId,
        addressShortName: indentAddressShortName,
        branchAddress: indentBranchAddress,
        city: indentCity,
        state: indentState,
        pincode: indentPincode,
        vendorKyc: vendorKycList,
        documents: indentDocuments,
        remarks: indentRemarks,
        status: isDraft ? 'Draft' : 'Pending Approval',
        effectiveDate,
      }

      if (isEditing && id) {
        updateAccountMapping(id, payload)
        toast(`${activeTab} Account Mapping updated successfully!`)
      } else {
        addAccountMapping(payload)
        toast(`${activeTab} Account Mapping submitted for approval!`)
      }
    }

    navigate('/finance/settlement-bank/account-mapping')
  }

  // Page title based on active tab
  const pageTitle =
    activeTab === 'WLA'
      ? 'Settlement Account Mapping Details'
      : `${activeTab} – Account Mapping Details`

  return (
    <div className="space-y-4 max-w-[1240px] pb-16 font-sans">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Home size={14} className="text-slate-400 shrink-0" />
        <Link to="/dashboard" className="hover:text-[#0066FF] transition-colors">
          Workspace
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        {isReport ? (
          <>
            <Link to="/reports" className="hover:text-[#0066FF] transition-colors">
              Reports & MIS
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/finance/settlement-bank/account-mapping?source=report" className="hover:text-[#0066FF] transition-colors">
              Settlement Account Mapping Report
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">
              {atmId || 'Mapping Details'}
            </span>
          </>
        ) : (
          <>
            <Link to="/finance" className="hover:text-[#0066FF] transition-colors">
              Finance
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/finance/account-management" className="hover:text-[#0066FF] transition-colors">
              Account Management
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/finance/settlement-bank" className="hover:text-[#0066FF] transition-colors">
              Settlement Bank
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/finance/settlement-bank/account-mapping" className="hover:text-[#0066FF] transition-colors">
              Account Mapping
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">
              {isEditing ? 'Edit Mapping' : 'Settlement Account Mapping Details'}
            </span>
          </>
        )}
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <FileText size={18} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              {pageTitle}
            </h1>
            <p className="text-[12px] text-slate-500">
              {isReport
                ? 'View settlement bank routing, nodal sweep rules, and KYC verification records.'
                : 'Configure settlement bank routing, nodal sweep rules, and KYC verification records.'}
            </p>
          </div>
        </div>
        {isReport && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            View-Only Report Mode
          </span>
        )}
      </div>

      {/* =========================================================================
          TAB 1: WLA MAPPING VIEW (IMAGE 1)
          ========================================================================= */}
      {activeTab === 'WLA' && (
        <div className="space-y-4">
          {/* Card 1: ATM & Account Type */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Landmark size={15} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800">ATM & Account Type</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 max-w-xl mb-5">
              <label className="text-xs font-semibold text-slate-700 shrink-0 w-20">
                ATM ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={atmId}
                  onChange={(e) => setAtmId(e.target.value)}
                  placeholder="Enter ATM ID (e.g. XY2012312)"
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {atmId && (
                  <button
                    type="button"
                    onClick={() => setAtmId('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => toast(`Searching ATM record for: ${atmId || 'current'}`)}
                className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors shrink-0"
              >
                Search
              </button>
            </div>

            {/* 3 Segmented Tabs */}
            <div className="pt-1 border-t border-slate-100">
              <TabSwitcher current={activeTab} onChange={setActiveTab} />
            </div>
          </div>

          {/* Card 2: Bank Account Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Landmark size={15} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800">Bank Account Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Name as per Bank Details */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Name as per the Bank Details <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={wlaNameAsPerBank}
                    onChange={(e) => setWlaNameAsPerBank(e.target.value)}
                    placeholder="Enter Name as per Bank Details"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Landmark size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <select
                      value={wlaBankName}
                      onChange={(e) => setWlaBankName(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                    </select>
                  </div>
                </div>

                {/* Bank Account No. */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Account No. <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaBankAccountNo}
                      onChange={(e) => setWlaBankAccountNo(e.target.value)}
                      placeholder="Enter Bank Account Number"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaIfscCode}
                      onChange={(e) => setWlaIfscCode(e.target.value.toUpperCase())}
                      placeholder="Enter IFSC Code"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 font-mono uppercase text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Name on PAN Card */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Name on PAN Card <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaNameOnPan}
                      onChange={(e) => setWlaNameOnPan(e.target.value)}
                      placeholder="Enter Name on PAN Card"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* PAN No. */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    PAN No. <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaPanNo}
                      onChange={(e) => setWlaPanNo(e.target.value.toUpperCase())}
                      placeholder="Enter PAN Number"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 font-mono uppercase text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Mobile Number Linked with Aadhaar */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Mobile Number Linked with Aadhaar <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaAadhaarMobile}
                      onChange={(e) => setWlaAadhaarMobile(e.target.value)}
                      placeholder="Enter Mobile Number"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email ID */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Email ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="email"
                      value={wlaEmailId}
                      onChange={(e) => setWlaEmailId(e.target.value)}
                      placeholder="Enter Email ID"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Bank Branch SOL ID */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Branch SOL ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaBranchSolId}
                      onChange={(e) => setWlaBranchSolId(e.target.value)}
                      placeholder="Enter Branch SOL ID"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Bank Manager Name */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Manager Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaBankManagerName}
                      onChange={(e) => setWlaBankManagerName(e.target.value)}
                      placeholder="Enter Bank Manager Name"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Bank Manager Mobile Number */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Manager Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      value={wlaBankManagerMobile}
                      onChange={(e) => setWlaBankManagerMobile(e.target.value)}
                      placeholder="Enter Manager Mobile Number"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Bank Manager Email ID */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Manager Email ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="email"
                      value={wlaBankManagerEmail}
                      onChange={(e) => setWlaBankManagerEmail(e.target.value)}
                      placeholder="Enter Manager Email ID"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Split (Documents Upload & View Documents) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Documents Upload */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <FileText size={15} />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800">Documents Upload</h2>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <select
                    value={wlaDocType}
                    onChange={(e) => setWlaDocType(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Cancelled Cheque">Cancelled Cheque</option>
                    <option value="Bank Statement">Bank Statement</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Manager Verification Letter">Manager Verification Letter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Upload Document <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl p-6 bg-blue-50/20 text-center hover:bg-blue-50/40 transition-colors">
                  <Paperclip size={24} className="text-blue-500 mb-2" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Choose file or drag & drop</span>
                    <button
                      type="button"
                      onClick={() => handleSimulateUpload('WLA')}
                      className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"
                    >
                      Browse
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Upload JPG, PNG or PDF (Max 5 MB)</p>
                </div>
              </div>
            </div>

            {/* Right: View Documents */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <FileText size={15} />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800">View Documents</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F0F5FA] text-slate-700 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">S No.</th>
                      <th className="py-2.5 px-3">Document Type</th>
                      <th className="py-2.5 px-3">File Name</th>
                      <th className="py-2.5 px-3">Uploaded On</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wlaDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No documents uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      wlaDocuments.map((doc, idx) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{doc.docType}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-blue-600">{doc.fileName}</td>
                          <td className="py-2 px-3 text-slate-500">{doc.uploadedOn}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toast(`Viewing document: ${doc.fileName}`)}
                                title="View Document"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toast(`Downloading: ${doc.fileName}`)}
                                title="Download Document"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Download size={13} />
                              </button>
                              {!isReport && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc.id, 'WLA')}
                                  title="Delete Document"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => navigate(isReport ? '/finance/settlement-bank/account-mapping?source=report' : '/finance/settlement-bank/account-mapping')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {!isReport && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Save size={14} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0066FF] text-xs font-bold text-white shadow-sm hover:bg-[#0052CC] transition-colors"
                >
                  Submit
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2 & 3: AXIS INDENT / ICICI MAPPING VIEW (IMAGE 2)
          ========================================================================= */}
      {(activeTab === 'Axis Indent' || activeTab === 'ICICI') && (
        <div className="space-y-4">
          {/* Top 3 Segmented Tabs */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <TabSwitcher current={activeTab} onChange={setActiveTab} />
          </div>

          {/* Section 1: HPY & Franchise Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Landmark size={15} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800">HPY & Franchise Details</h2>
            </div>

            {/* HPY Code Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 max-w-md">
              <label className="text-xs font-semibold text-slate-700 shrink-0">
                HPY Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={hpyCode}
                  onChange={(e) => setHpyCode(e.target.value)}
                  placeholder="Search HPY Code"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => toast(`HPY Record fetched for: ${hpyCode}`)}
                className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors shrink-0"
              >
                Searchable
              </button>
            </div>

            {/* 5-Field Row: ATM ID, Location, FR Name, Contact, Email ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">ATM ID</label>
                <div className="relative">
                  <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <select
                    value={atmId}
                    onChange={(e) => setAtmId(e.target.value)}
                    className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="XY2012312">XY2012312</option>
                    <option value="DX-UP-02391">DX-UP-02391</option>
                    <option value="DX-KA-03810">DX-KA-03810</option>
                    <option value="DX-DL-01944">DX-DL-01944</option>
                    <option value="DX-GJ-02988">DX-GJ-02988</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Location</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    value={indentLocation}
                    onChange={(e) => setIndentLocation(e.target.value)}
                    placeholder="Enter Location"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">FR Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    value={indentFrName}
                    onChange={(e) => setIndentFrName(e.target.value)}
                    placeholder="Enter FR Name"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Contact</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    value={indentContact}
                    onChange={(e) => setIndentContact(e.target.value)}
                    placeholder="Enter Contact Number"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Email ID</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input
                    type="email"
                    value={indentEmail}
                    onChange={(e) => setIndentEmail(e.target.value)}
                    placeholder="Enter Email ID"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Axis / ICICI Bank Branch Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Building2 size={15} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800">
                {activeTab === 'Axis Indent' ? 'Axis Bank Branch Details' : 'ICICI Bank Branch Details'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
              {/* SOL ID */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {activeTab === 'Axis Indent' ? 'Axis SOL-ID' : 'ICICI SOL-ID'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    value={indentSolId}
                    onChange={(e) => setIndentSolId(e.target.value)}
                    placeholder="Enter SOL-ID"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Address Short Name */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Address Short Name
                </label>
                <input
                  type="text"
                  value={indentAddressShortName}
                  onChange={(e) => setIndentAddressShortName(e.target.value)}
                  placeholder="Enter Short Name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Branch Address */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Branch Address
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-2.5 text-blue-600" />
                  <textarea
                    rows={1}
                    value={indentBranchAddress}
                    onChange={(e) => setIndentBranchAddress(e.target.value)}
                    placeholder="Enter Complete Branch Address"
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Address City */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Address City
                </label>
                <input
                  type="text"
                  value={indentCity}
                  onChange={(e) => setIndentCity(e.target.value)}
                  placeholder="Enter City"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Address State */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Address State
                </label>
                <select
                  value={indentState}
                  onChange={(e) => setIndentState(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                </select>
              </div>

              {/* Zip / Pin & IFSC Code */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Zip / Pin
                </label>
                <input
                  type="text"
                  value={indentPincode}
                  onChange={(e) => setIndentPincode(e.target.value)}
                  placeholder="Pin Code"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Row for IFSC Code */}
            <div className="max-w-xs pt-1">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                IFSC Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Landmark size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="text"
                  value={indentIfscCode}
                  onChange={(e) => setIndentIfscCode(e.target.value.toUpperCase())}
                  placeholder="Enter IFSC Code"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono uppercase font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vendor / KYC Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <ShieldCheck size={15} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800">Vendor / KYC Details</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0F5FA] text-slate-700 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-36">Person</th>
                    <th className="py-2.5 px-3">
                      Vendor Name <span className="text-rose-500">*</span>
                    </th>
                    <th className="py-2.5 px-3 w-56">
                      Document Type <span className="text-rose-500">*</span>
                    </th>
                    <th className="py-2.5 px-3">
                      Document Reference No. <span className="text-rose-500">*</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorKycList.map((item, index) => {
                    const isNewPerson = index % 2 === 0
                    return (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        {isNewPerson ? (
                          <td
                            rowSpan={2}
                            className="py-3 px-3 font-semibold text-slate-800 bg-slate-50/50 align-top border-r border-slate-100"
                          >
                            {item.person}
                          </td>
                        ) : null}
                        <td className="py-2 px-3">
                          <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                            <input
                              type="text"
                              value={item.vendorName}
                              onChange={(e) => handleUpdateVendorKyc(index, 'vendorName', e.target.value)}
                              placeholder="Enter Vendor Name"
                              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="relative">
                            <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                            <select
                              value={item.docType}
                              onChange={(e) => handleUpdateVendorKyc(index, 'docType', e.target.value)}
                              className="w-full pl-9 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="PAN Card">PAN Card</option>
                              <option value="Aadhaar No.">Aadhaar No.</option>
                              <option value="Voter ID">Voter ID</option>
                              <option value="Passport">Passport</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="relative">
                            <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                            <input
                              type="text"
                              value={item.docRefNo}
                              onChange={(e) => handleUpdateVendorKyc(index, 'docRefNo', e.target.value.toUpperCase())}
                              placeholder="Enter Document Reference No."
                              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Documents Upload & Remarks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Documents Upload */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <FileText size={15} />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800">Documents Upload</h2>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <select
                    value={indentDocType}
                    onChange={(e) => setIndentDocType(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Cancelled Cheque Copy">Cancelled Cheque Copy</option>
                    <option value="Bank Statement Copy">Bank Statement Copy</option>
                    <option value="PAN Card Copy">PAN Card Copy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Upload Document <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl p-5 bg-blue-50/20 text-center hover:bg-blue-50/40 transition-colors">
                  <Paperclip size={22} className="text-blue-500 mb-1.5" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Choose file or drag & drop</span>
                    <button
                      type="button"
                      onClick={() => handleSimulateUpload('Indent')}
                      className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"
                    >
                      Browse
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Upload JPG, PNG or PDF (Max 5 MB)</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Uploaded Documents:</span>
                <button
                  type="button"
                  onClick={() =>
                    toast(
                      `Uploaded documents:\n${indentDocuments.map((d) => d.fileName).join(', ')}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <FileText size={13} />
                  View Uploaded Document ({indentDocuments.length})
                </button>
              </div>
            </div>

            {/* Right: Remarks */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 flex flex-col">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <MessageSquare size={15} />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800">Remarks</h2>
              </div>

              <div className="flex-1 flex flex-col">
                <textarea
                  rows={6}
                  maxLength={500}
                  value={indentRemarks}
                  onChange={(e) => setIndentRemarks(e.target.value)}
                  placeholder="Enter remarks here..."
                  className="w-full flex-1 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
                <div className="text-right text-[10px] text-slate-400 mt-1">
                  {indentRemarks.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => navigate(isReport ? '/finance/settlement-bank/account-mapping?source=report' : '/finance/settlement-bank/account-mapping')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {!isReport && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Save size={14} />
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0066FF] text-xs font-bold text-white shadow-sm hover:bg-[#0052CC] transition-colors"
                >
                  Submit for Approval
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
