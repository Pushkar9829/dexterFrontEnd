import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Home,
  ChevronRight,
  ArrowLeft,
  Search,
  Landmark,
  CreditCard,
  FileText,
  Paperclip,
  Eye,
  Download,
  Trash2,
  Save,
  Mail,
  Send,
  MessageSquare,
  X,
  FileCheck,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import { useReportMode } from '@/hooks/useReportMode'
import {
  getAcChangeRequestById,
  addAcChangeRequest,
  updateAcChangeRequest,
  type AcChangeRequestRecord,
  type AccountChangeParticulars,
  type UploadedDoc,
} from '@/data/financeSettlementBank'

export default function AcChangeRequestForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { isReport } = useReportMode()
  const isEditing = Boolean(id && id !== 'new')

  // Top info states
  const [atmId, setAtmId] = useState('DX-UP-02391')
  const [hpyCode, setHpyCode] = useState('HPY-9921408')
  const [franchiseeName, setFranchiseeName] = useState('Ranjeet Pal')
  const [mobileNo, setMobileNo] = useState('8126817131')
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0])

  // --- Section 1: Settlement Account (Existing vs New WLA Account) ---
  const [settlementExisting, setSettlementExisting] = useState<AccountChangeParticulars>({
    nameAsPerBank: 'Ranjeet Pal & Shikha Pal',
    bankName: 'Axis Indent Account',
    accountNumber: '91802008765432',
    ifscCode: 'UTIB0000240',
    nameOnPan: 'Ranjeet Pal',
    panNo: 'CSPP1214179E',
    aadhaarLinkedMobile: '8126817131',
    emailId: 'ranjeetpal.mainpuri@gmail.com',
    reasonForChange: 'Axis Bank does not provide full cash daily.',
  })

  const [settlementNew, setSettlementNew] = useState<AccountChangeParticulars>({
    nameAsPerBank: 'Ranjeet Pal',
    bankName: 'HDFC Bank',
    accountNumber: '502000622323610',
    ifscCode: 'HDFC0003925',
    nameOnPan: 'Ranjeet Pal',
    panNo: 'CSPP1214179E',
    aadhaarLinkedMobile: '8126817131',
    emailId: 'ranjeetpal.mainpuri@gmail.com',
    reasonForChange: 'Axis Bank does not provide full cash daily.',
  })

  // --- Section 2: Payout Account (Existing vs New) ---
  const [hasPayoutChange, setHasPayoutChange] = useState(false)
  const [payoutExisting, setPayoutExisting] = useState<AccountChangeParticulars>({
    nameAsPerBank: 'Ranjeet Pal',
    bankName: 'BANK OF INDIA',
    accountNumber: '770310110005160',
    ifscCode: 'BKID0007703',
    nameOnPan: 'Ranjeet Pal',
    panNo: 'CSPP1214179E',
    aadhaarLinkedMobile: '8126817131',
    emailId: 'ranjeetpal.mainpuri@gmail.com',
    reasonForChange: 'There are no changes in the payout account.',
  })

  const [payoutNew, setPayoutNew] = useState<AccountChangeParticulars>({
    nameAsPerBank: 'NA',
    bankName: 'NA',
    accountNumber: 'NA',
    ifscCode: 'NA',
    nameOnPan: 'NA',
    panNo: 'NA',
    aadhaarLinkedMobile: 'NA',
    emailId: 'NA',
    reasonForChange: 'NA',
  })

  // --- Section 3: Documents ---
  const [docTypeToUpload, setDocTypeToUpload] = useState('Cancelled Cheque')
  const [documents, setDocuments] = useState<UploadedDoc[]>([
    { id: 'd-1', docType: 'Cancelled Cheque', fileName: 'hdfc_cheque_ranjeet.pdf', uploadedOn: '24-10-2026' },
    { id: 'd-2', docType: 'PAN Card Copy', fileName: 'pan_ranjeet_pal.pdf', uploadedOn: '24-10-2026' },
    { id: 'd-3', docType: 'Bank Statement', fileName: 'boi_statement.pdf', uploadedOn: '24-10-2026' },
  ])

  // --- Section 4: Note ---
  const [note, setNote] = useState(
    'Franchisee requested quick settlement routing to avoid cash out during peak daily transactions.'
  )

  // Email Modal Dialog State
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('ranjeetpal.mainpuri@gmail.com')
  const [emailCc, setEmailCc] = useState('operations@dexterwla.com, settlements@dexterwla.com')

  // Load existing record if in edit mode
  useEffect(() => {
    if (isEditing && id) {
      const rec = getAcChangeRequestById(id)
      if (rec) {
        setAtmId(rec.atmId || '')
        setHpyCode(rec.hpyCode || '')
        setFranchiseeName(rec.franchiseeName || '')
        setMobileNo(rec.mobileNo || '')
        setRequestDate(rec.requestDate || new Date().toISOString().split('T')[0])
        setSettlementExisting(rec.settlementExisting)
        setSettlementNew(rec.settlementNew)
        setHasPayoutChange(Boolean(rec.hasPayoutChange))
        setPayoutExisting(rec.payoutExisting)
        setPayoutNew(rec.payoutNew)
        if (rec.documents && rec.documents.length > 0) {
          setDocuments(rec.documents)
        }
        if (rec.note) {
          setNote(rec.note)
        }
      }
    }
  }, [id, isEditing])

  // Document upload simulation
  const handleSimulateUpload = () => {
    const ext = docTypeToUpload.toLowerCase().includes('statement') ? 'pdf' : 'pdf'
    const cleanName = docTypeToUpload.toLowerCase().replace(/\s+/g, '_') + `_${Date.now().toString().slice(-4)}.${ext}`
    const newDoc: UploadedDoc = {
      id: Date.now().toString(),
      docType: docTypeToUpload,
      fileName: cleanName,
      uploadedOn: new Date().toISOString().split('T')[0],
    }
    setDocuments((prev) => [...prev, newDoc])
    toast(`Uploaded: ${cleanName}`)
  }

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    toast('Document removed')
  }

  // Toggle Payout change
  const handleTogglePayoutChange = (checked: boolean) => {
    setHasPayoutChange(checked)
    if (checked) {
      setPayoutNew({
        nameAsPerBank: franchiseeName,
        bankName: settlementNew.bankName || 'HDFC Bank',
        accountNumber: settlementNew.accountNumber || '',
        ifscCode: settlementNew.ifscCode || '',
        nameOnPan: settlementNew.nameOnPan || franchiseeName,
        panNo: settlementNew.panNo || '',
        aadhaarLinkedMobile: mobileNo,
        emailId: settlementNew.emailId || '',
        reasonForChange: 'Updating payout account to match settlement bank details.',
      })
    } else {
      setPayoutNew({
        nameAsPerBank: 'NA',
        bankName: 'NA',
        accountNumber: 'NA',
        ifscCode: 'NA',
        nameOnPan: 'NA',
        panNo: 'NA',
        aadhaarLinkedMobile: 'NA',
        emailId: 'NA',
        reasonForChange: 'NA',
      })
    }
  }

  // Save / Submit
  const handleSaveOrSubmit = (status: 'Draft' | 'Pending') => {
    if (!atmId || !franchiseeName) {
      toast('Please enter ATM ID and Franchisee Name')
      return
    }
    if (status === 'Pending' && (!settlementNew.bankName || !settlementNew.accountNumber || !settlementNew.ifscCode)) {
      toast('Please enter required New WLA Account details (Bank, Account No, IFSC)')
      return
    }

    const payload: Omit<AcChangeRequestRecord, 'id'> = {
      atmId,
      hpyCode,
      franchiseeName,
      mobileNo,
      emailId: settlementNew.emailId || emailTo,
      requestDate,
      settlementExisting,
      settlementNew,
      hasPayoutChange,
      payoutExisting,
      payoutNew,
      documents,
      note,
      status: status === 'Draft' ? 'Under Review' : 'Pending',
    }

    if (isEditing && id) {
      updateAcChangeRequest(id, payload)
      toast(`Change Request ${id} updated successfully!`)
    } else {
      const created = addAcChangeRequest(payload)
      toast(`Change Request ${created.id} submitted successfully!`)
    }

    navigate('/finance/settlement-bank/ac-change-request')
  }

  // Send Email Simulation
  const handleSendEmail = () => {
    setShowEmailModal(false)
    toast(`Change request details emailed to ${emailTo}`)
  }

  return (
    <div className="space-y-4 max-w-[1280px] pb-16 font-sans">
      {/* Top Breadcrumbs */}
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
            <Link to="/finance/settlement-bank/ac-change-request?source=report" className="hover:text-[#0066FF] transition-colors">
              A/C Change Request Report
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">
              {id || 'Request Details'}
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
            <Link to="/finance/settlement-bank/ac-change-request" className="hover:text-[#0066FF] transition-colors">
              A/C Change Request
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-800">
              {isEditing ? `Edit Request: ${id}` : 'New Change Request'}
            </span>
          </>
        )}
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <FileCheck size={18} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
              Account Change Request Form
            </h1>
            <p className="text-[12px] text-slate-500">
              {isReport
                ? 'View modification details and verification history for Settlement Account and Payout Account.'
                : 'Submit and verify modification requests for Settlement Account and Payout Account.'}
            </p>
          </div>
        </div>
        {isReport && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            View-Only Report Mode
          </span>
        )}
      </div>

      {/* Card 1: Header / ATM & Franchisee Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Landmark size={15} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">ATM & Franchise Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              ATM ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={atmId}
                onChange={(e) => setAtmId(e.target.value)}
                placeholder="Enter ATM ID"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">HPY Code</label>
            <input
              type="text"
              value={hpyCode}
              onChange={(e) => setHpyCode(e.target.value)}
              placeholder="e.g. HPY-9921408"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Franchisee Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={franchiseeName}
              onChange={(e) => setFranchiseeName(e.target.value)}
              placeholder="Enter Franchisee Name"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
              placeholder="Enter Mobile Number"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Request Date</label>
            <input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: TYPE OF ACCOUNT WITH HPY - SETTLEMENT ACCOUNT
          ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Landmark size={15} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                Type of Account with HPY
              </div>
              <h2 className="text-[16px] font-bold text-slate-900">Settlement Account</h2>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Nodal & Cash Replenishment Account
          </span>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0F5FA] text-slate-800 font-bold text-[12px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-1/4">Particulars</th>
                <th className="py-3 px-4 w-[37.5%] border-l border-slate-200 bg-slate-100/50">
                  Existing
                </th>
                <th className="py-3 px-4 w-[37.5%] border-l border-slate-200 bg-blue-50/40 text-blue-900 font-extrabold">
                  New WLA Account <span className="text-rose-500">*</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Name as per the Bank Details */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">
                  Name as per the Bank Details
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.nameAsPerBank}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, nameAsPerBank: e.target.value })
                    }
                    placeholder="Existing Name as per Bank"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="text"
                    required
                    value={settlementNew.nameAsPerBank}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, nameAsPerBank: e.target.value })
                    }
                    placeholder="Enter Name for New WLA Account"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 2: Bank Name */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Bank Name</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.bankName}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, bankName: e.target.value })
                    }
                    placeholder="e.g. Axis Indent Account"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <select
                    value={settlementNew.bankName}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, bankName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                  </select>
                </td>
              </tr>

              {/* Row 3: Bank Account No. */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Bank Account No.</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.accountNumber}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, accountNumber: e.target.value })
                    }
                    placeholder="Existing Account Number"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="text"
                    required
                    value={settlementNew.accountNumber}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, accountNumber: e.target.value })
                    }
                    placeholder="e.g. 502000622323610"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 4: IFSC Code */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">IFSC Code</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.ifscCode}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, ifscCode: e.target.value })
                    }
                    placeholder="Existing IFSC Code"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="text"
                    required
                    value={settlementNew.ifscCode}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, ifscCode: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. HDFC0003925"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 5: Name on PAN Card */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Name on PAN Card</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.nameOnPan}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, nameOnPan: e.target.value })
                    }
                    placeholder="Existing Name on PAN"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="text"
                    value={settlementNew.nameOnPan}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, nameOnPan: e.target.value })
                    }
                    placeholder="Enter Name on PAN Card"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 6: PAN No */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">PAN No</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.panNo}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, panNo: e.target.value })
                    }
                    placeholder="Existing PAN No"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="text"
                    required
                    value={settlementNew.panNo}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, panNo: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. CSPP1214179E"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 7: Mobile number linked with Aadhar */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">
                  Mobile number linked with Aadhar
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={settlementExisting.aadhaarLinkedMobile}
                    onChange={(e) =>
                      setSettlementExisting({
                        ...settlementExisting,
                        aadhaarLinkedMobile: e.target.value,
                      })
                    }
                    placeholder="Existing Mobile Number"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="text"
                    required
                    value={settlementNew.aadhaarLinkedMobile}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, aadhaarLinkedMobile: e.target.value })
                    }
                    placeholder="e.g. 8126817131"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono text-blue-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 8: Email ID */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Email ID</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="email"
                    value={settlementExisting.emailId}
                    onChange={(e) =>
                      setSettlementExisting({ ...settlementExisting, emailId: e.target.value })
                    }
                    placeholder="Existing Email ID"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-blue-50/10">
                  <input
                    type="email"
                    required
                    value={settlementNew.emailId}
                    onChange={(e) =>
                      setSettlementNew({ ...settlementNew, emailId: e.target.value })
                    }
                    placeholder="e.g. ranjeetpal.mainpuri@gmail.com"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-blue-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>

              {/* Row 9: Reason for Account Change */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700 align-top pt-3">
                  Reason for Account Change
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30" colSpan={2}>
                  <textarea
                    rows={2}
                    value={settlementNew.reasonForChange}
                    onChange={(e) => {
                      setSettlementNew({ ...settlementNew, reasonForChange: e.target.value })
                      setSettlementExisting({
                        ...settlementExisting,
                        reasonForChange: e.target.value,
                      })
                    }}
                    placeholder="Specify detailed reason (e.g. Axis Bank does not provide full cash daily.)"
                    className="w-full p-2.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: TYPE OF ACCOUNT WITH HPY - PAYOUT ACCOUNT
          ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <CreditCard size={15} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                Type of Account with HPY
              </div>
              <h2 className="text-[16px] font-bold text-slate-900">Payout Account</h2>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={hasPayoutChange}
              onChange={(e) => handleTogglePayoutChange(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Change Payout Account details as well?</span>
          </label>
        </div>

        {/* Side-by-Side Comparison Table for Payout */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0F5FA] text-slate-800 font-bold text-[12px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-1/4">Particulars</th>
                <th className="py-3 px-4 w-[37.5%] border-l border-slate-200 bg-slate-100/50">
                  Existing
                </th>
                <th
                  className={`py-3 px-4 w-[37.5%] border-l border-slate-200 font-extrabold ${
                    hasPayoutChange ? 'bg-emerald-50/50 text-emerald-900' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  New {hasPayoutChange ? '' : '(NA - No Change)'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Name as per the Bank Details */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">
                  Name as per the Bank Details
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.nameAsPerBank}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, nameAsPerBank: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.nameAsPerBank}
                    onChange={(e) =>
                      setPayoutNew({ ...payoutNew, nameAsPerBank: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 2: Bank Name */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Bank Name</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.bankName}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, bankName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.bankName}
                    onChange={(e) => setPayoutNew({ ...payoutNew, bankName: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 3: Bank Account No. */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Bank Account No.</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.accountNumber}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, accountNumber: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.accountNumber}
                    onChange={(e) =>
                      setPayoutNew({ ...payoutNew, accountNumber: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 4: IFSC Code */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">IFSC Code</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.ifscCode}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, ifscCode: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.ifscCode}
                    onChange={(e) =>
                      setPayoutNew({ ...payoutNew, ifscCode: e.target.value.toUpperCase() })
                    }
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 5: Name on PAN Card */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Name on PAN Card</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.nameOnPan}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, nameOnPan: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.nameOnPan}
                    onChange={(e) => setPayoutNew({ ...payoutNew, nameOnPan: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 6: PAN No */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">PAN No</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.panNo}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, panNo: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.panNo}
                    onChange={(e) =>
                      setPayoutNew({ ...payoutNew, panNo: e.target.value.toUpperCase() })
                    }
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono uppercase ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 7: Mobile number linked with Aadhar */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">
                  Mobile number linked with Aadhar
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="text"
                    value={payoutExisting.aadhaarLinkedMobile}
                    onChange={(e) =>
                      setPayoutExisting({
                        ...payoutExisting,
                        aadhaarLinkedMobile: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={payoutNew.aadhaarLinkedMobile}
                    onChange={(e) =>
                      setPayoutNew({ ...payoutNew, aadhaarLinkedMobile: e.target.value })
                    }
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs font-mono ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 8: Email ID */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700">Email ID</td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30">
                  <input
                    type="email"
                    value={payoutExisting.emailId}
                    onChange={(e) =>
                      setPayoutExisting({ ...payoutExisting, emailId: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-l border-slate-200">
                  <input
                    type="email"
                    disabled={!hasPayoutChange}
                    value={payoutNew.emailId}
                    onChange={(e) => setPayoutNew({ ...payoutNew, emailId: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs ${
                      hasPayoutChange ? 'bg-white text-slate-800 font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  />
                </td>
              </tr>

              {/* Row 9: Reason for Account Change */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-700 align-top pt-3">
                  Reason for Account Change
                </td>
                <td className="py-2 px-4 border-l border-slate-200 bg-slate-50/30" colSpan={2}>
                  <input
                    type="text"
                    disabled={!hasPayoutChange}
                    value={hasPayoutChange ? payoutNew.reasonForChange : payoutExisting.reasonForChange}
                    onChange={(e) => setPayoutNew({ ...payoutNew, reasonForChange: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs ${
                      hasPayoutChange ? 'bg-white text-slate-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3 & 4: DOCUMENTS (UPLOAD & VIEW) & NOTE
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Documents Card (Upload & View) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <FileText size={15} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800">Documents</h2>
          </div>

          {!isReport && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Document Type
                </label>
                <select
                  value={docTypeToUpload}
                  onChange={(e) => setDocTypeToUpload(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Cancelled Cheque">Cancelled Cheque</option>
                  <option value="Bank Statement">Bank Statement</option>
                  <option value="PAN Card Copy">PAN Card Copy</option>
                  <option value="Passbook Copy">Passbook Copy</option>
                  <option value="Branch NOC Letter">Branch NOC Letter</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleSimulateUpload}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <Paperclip size={14} />
                  Upload Document
                </button>
              </div>
            </div>
          )}

          {/* Mini Table for View Documents */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-[#F0F5FA] px-3 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              Uploaded Documents ({documents.length})
            </div>
            <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
              {documents.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No documents uploaded yet.
                </div>
              ) : (
                documents.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-400 font-mono">{idx + 1}.</span>
                      <span className="font-semibold text-slate-800 shrink-0">{doc.docType}:</span>
                      <span className="font-mono text-[11px] text-blue-600 truncate">
                        {doc.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
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
                        onClick={() => toast(`Downloading document: ${doc.fileName}`)}
                        title="Download Document"
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Download size={13} />
                      </button>
                      {!isReport && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete Document"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Note Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MessageSquare size={15} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800">Note</h2>
          </div>

          <p className="text-[11px] text-slate-500">
            Add operational notes, validation observations, or special instructions for finance approval.
          </p>

          <textarea
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isReport}
            placeholder="Enter operational or review notes..."
            className="w-full flex-1 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none disabled:bg-slate-50 disabled:text-slate-600"
          />
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: BOTTOM ACTION BAR (Save, Submit, Email)
          ========================================================================= */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate(isReport ? '/finance/settlement-bank/ac-change-request?source=report' : '/finance/settlement-bank/ac-change-request')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {!isReport && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSaveOrSubmit('Draft')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Save size={14} />
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Mail size={14} />
              Email
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrSubmit('Pending')}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0066FF] text-xs font-bold text-white shadow-sm hover:bg-[#0052CC] transition-colors"
            >
              <Send size={14} />
              Submit
            </button>
          </div>
        )}
      </div>

      {/* Email Modal Dialog */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Email Change Request</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Send To:</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CC:</label>
                <input
                  type="text"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-[11px] space-y-1">
                <p className="font-semibold">Email Summary Preview:</p>
                <p>• Subject: Account Change Request - {atmId} ({franchiseeName})</p>
                <p>• Settlement Bank Change: {settlementExisting.bankName} → {settlementNew.bankName}</p>
                <p>• New WLA Account No: {settlementNew.accountNumber}</p>
                <p>• Attached Documents: {documents.length} files</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="px-4 py-1.5 rounded-lg bg-[#0066FF] text-white font-semibold hover:bg-[#0052CC]"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

