import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileText,
  Home,
  IndianRupee,
  Mail,
  Paperclip,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import {
  useChargeBackStore,
  CHARGEBACK_ATMS,
  INITIAL_CHARGE_BACK_DISPUTES,
} from '@/data/chargeBackDisputes'
import { toast } from '@/components/ui/Toast'

export default function ChargeBackDisputeForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { records, addRecord, updateRecord } = useChargeBackStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Find existing record if editing or viewing
  const existing = id
    ? records.find((r) => r.id === id || r.ticketNumber === id) ||
      INITIAL_CHARGE_BACK_DISPUTES.find((r) => r.id === id || r.ticketNumber === id)
    : undefined

  // Active Tab: FFM or SF
  const [activeTab, setActiveTab] = useState<'FFM' | 'SF'>(existing?.fundingType || 'FFM')

  // Common Form States
  const [atmId, setAtmId] = useState(existing?.atmId || 'MBP12121')
  const [cardNumber, setCardNumber] = useState(existing?.cardNumber || '6082********2486')
  const [rrnNumber, setRrnNumber] = useState(existing?.rrnNumber || '626915392411')
  const [txnAmt, setTxnAmt] = useState(existing?.txnAmt || '5000')
  const [adjustedAmt, setAdjustedAmt] = useState(existing?.adjustedAmt || '0')
  const [disputeAmt, setDisputeAmt] = useState(existing?.disputeAmt || '400')
  const [mspReferenceNo, setMspReferenceNo] = useState(existing?.mspReferenceNo || '4192')
  const [sendStatus, setSendStatus] = useState(existing?.sendStatus || 'Send')

  // Nature of Incident
  const [natureOptions, setNatureOptions] = useState<string[]>([
    'Pre-Arbitration Raise',
    'Chargeback Raised',
    'Representment Filed',
    'Good Faith Request',
    'Arbitration Accepted',
  ])
  const [natureOfIncident, setNatureOfIncident] = useState(
    existing?.natureOfIncident || 'Pre-Arbitration Raise'
  )

  // Error Description
  const [errorOptions, setErrorOptions] = useState<string[]>([
    'POWER INTERRUPTION D TRXN STATUS JAM',
    'TRXN STATUS JAM',
    'SHUTTER OPEN TIMEOUT',
    'PARTIAL CASH DISPENSED',
    'NETWORK TIMEOUT / COMM FAIL',
    'CARD RETRACTED / PURGE ERROR',
  ])
  const [errorDescription, setErrorDescription] = useState(
    existing?.errorDescription || 'POWER INTERRUPTION D TRXN STATUS JAM'
  )

  // Date and Time
  const [txnDate, setTxnDate] = useState(existing?.txnDate || '28-09-2026')
  const [txnTime, setTxnTime] = useState(existing?.txnTime || '10:53:20')

  // Remarks & Communication
  const [wlaoRemark, setWlaoRemark] = useState(existing?.wlaoRemark || 'Done')
  const [hitachiEmailDate, setHitachiEmailDate] = useState(existing?.hitachiEmailDate || '03-10-2026')
  const [emailResponseDate, setEmailResponseDate] = useState(existing?.emailResponseDate || '05-10-2026')
  const [frRemark, setFrRemark] = useState(existing?.frRemark || 'FR Confirm No Overage Found.')
  const [remarks, setRemarks] = useState(
    existing?.remarks || 'Customer debited but cash jammed in dispenser cassette #2.'
  )

  // Documents
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(
    existing?.uploadedDocuments || ['ej_log_mbp12121.pdf', 'cbr_statement.pdf', 'dispute_slip.jpg']
  )

  // Modals
  const [showDocModal, setShowDocModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showAddOptionModal, setShowAddOptionModal] = useState<'nature' | 'error' | null>(null)
  const [newOptionValue, setNewOptionValue] = useState('')

  // ATM Suggestions Dropdown
  const [showAtmDropdown, setShowAtmDropdown] = useState(false)

  // Sync state if existing record changes
  useEffect(() => {
    if (existing) {
      setActiveTab(existing.fundingType)
      setAtmId(existing.atmId)
      setCardNumber(existing.cardNumber)
      setRrnNumber(existing.rrnNumber)
      setTxnAmt(existing.txnAmt)
      setAdjustedAmt(existing.adjustedAmt)
      setDisputeAmt(existing.disputeAmt)
      setMspReferenceNo(existing.mspReferenceNo)
      setSendStatus(existing.sendStatus)
      if (existing.natureOfIncident) setNatureOfIncident(existing.natureOfIncident)
      setErrorDescription(existing.errorDescription)
      setTxnDate(existing.txnDate)
      setTxnTime(existing.txnTime)
      if (existing.wlaoRemark) setWlaoRemark(existing.wlaoRemark)
      if (existing.hitachiEmailDate) setHitachiEmailDate(existing.hitachiEmailDate)
      if (existing.emailResponseDate) setEmailResponseDate(existing.emailResponseDate)
      if (existing.frRemark) setFrRemark(existing.frRemark)
      setRemarks(existing.remarks)
      if (existing.uploadedDocuments) setUploadedFiles(existing.uploadedDocuments)
    }
  }, [existing])

  // Handle Tab Change
  const handleTabSwitch = (tab: 'FFM' | 'SF') => {
    setActiveTab(tab)
    if (!existing) {
      if (tab === 'SF') {
        setAtmId('MCRM7303')
        setCardNumber('817509******6868')
        setRrnNumber('629118042190')
        setTxnAmt('800')
        setAdjustedAmt('0')
        setDisputeAmt('800')
        setSendStatus('DONE')
        setErrorDescription('TRXN STATUS JAM')
        setTxnDate('18-10-2026')
        setTxnTime('12:00:00')
      } else {
        setAtmId('MBP12121')
        setCardNumber('6082********2486')
        setRrnNumber('626915392411')
        setTxnAmt('5000')
        setAdjustedAmt('0')
        setDisputeAmt('400')
        setSendStatus('Send')
        setNatureOfIncident('Pre-Arbitration Raise')
        setErrorDescription('POWER INTERRUPTION D TRXN STATUS JAM')
        setTxnDate('28-09-2026')
        setTxnTime('10:53:20')
      }
    }
  }

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const names = Array.from(e.target.files).map((f) => f.name)
      setUploadedFiles((prev) => [...prev, ...names])
      toast(`Added ${names.length} file(s)`)
    }
  }

  const handleAddOption = () => {
    if (!newOptionValue.trim()) return
    if (showAddOptionModal === 'nature') {
      setNatureOptions((prev) => [...prev, newOptionValue.trim()])
      setNatureOfIncident(newOptionValue.trim())
      toast('Added Nature of Incident option')
    } else if (showAddOptionModal === 'error') {
      setErrorOptions((prev) => [...prev, newOptionValue.trim()])
      setErrorDescription(newOptionValue.trim())
      toast('Added Error Description option')
    }
    setNewOptionValue('')
    setShowAddOptionModal(null)
  }

  // Submit Handler
  const handleSubmit = (status: 'Pending' | 'Draft' | 'In Progress' = 'Pending') => {
    if (!atmId.trim()) {
      toast('Please enter or select an ATM ID')
      return
    }

    if (existing) {
      updateRecord(existing.id, {
        fundingType: activeTab,
        atmId,
        cardNumber,
        rrnNumber,
        txnAmt,
        adjustedAmt,
        disputeAmt,
        mspReferenceNo,
        sendStatus,
        natureOfIncident,
        errorDescription,
        txnDate,
        txnTime,
        wlaoRemark,
        hitachiEmailDate,
        emailResponseDate,
        frRemark,
        remarks,
        uploadedDocuments: uploadedFiles,
        status,
      })
      toast('Charge Back Dispute updated successfully!')
    } else {
      const created = addRecord({
        fundingType: activeTab,
        atmId,
        cardNumber,
        rrnNumber,
        txnAmt,
        adjustedAmt,
        disputeAmt,
        mspReferenceNo,
        sendStatus,
        natureOfIncident,
        errorDescription,
        txnDate,
        txnTime,
        txnType: 'Withdrawal - Card',
        txnId: `TXN${Math.floor(10000000 + Math.random() * 90000000)}`,
        utr: `UTR${Math.floor(10000000 + Math.random() * 90000000)}`,
        wlaoRemark,
        hitachiEmailDate,
        emailResponseDate,
        frRemark,
        remarks,
        uploadedDocuments: uploadedFiles,
        status,
      })
      toast(`Charge Back Dispute registered! Ticket #${created.ticketNumber}`)
    }
    navigate('/operations/reconciliation/charge-back')
  }

  // ATM filter
  const filteredAtms = CHARGEBACK_ATMS.filter((a) =>
    a.atmId.toLowerCase().includes(atmId.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 pb-16 font-sans space-y-4">
      {/* Breadcrumb matching screenshots */}
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
        <Link to="/operations/reconciliation/charge-back" className="hover:text-[#0066FF] transition-colors">
          Charge Back Dispute
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">
          {activeTab === 'FFM' ? 'Full Funding Sites' : 'Self Funding Sites'}
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-xs">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[25px]">
              {activeTab === 'FFM'
                ? 'Full Funding Sites TXNs Charge Back Dispute'
                : 'Self Funding Sites Charge Back Dispute'}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              {activeTab === 'FFM'
                ? 'Register and manage charge back disputes for Full Funding (FFM) sites with complete details.'
                : 'Register and manage charge back disputes for Self Funding (SF) sites with complete details.'}
            </p>
          </div>
        </div>

        {/* Top Tab Bar: FFM vs SF as specified in Image 02 */}
        <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 p-1 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => handleTabSwitch('FFM')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold transition-all cursor-pointer ${
              activeTab === 'FFM'
                ? 'bg-[#0066FF] text-white shadow-sm'
                : 'text-[#0066FF] hover:bg-white/80'
            }`}
          >
            <span>Full Funding (FFM)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('SF')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold transition-all cursor-pointer ${
              activeTab === 'SF'
                ? 'bg-[#0066FF] text-white shadow-sm'
                : 'text-[#0066FF] hover:bg-white/80'
            }`}
          >
            <span>Self Funding (SF)</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ============================================================== */}
      {/* TAB 1: FULL FUNDING (FFM) FORM (Matching Image 3)               */}
      {/* ============================================================== */}
      {activeTab === 'FFM' && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          {/* Card Header */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066FF] text-white">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-[15px] font-bold text-[#1E293B]">Charge Back Dispute Details</h3>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
            {/* ----------------- LEFT COLUMN ----------------- */}
            <div className="space-y-3">
              {/* ATM ID * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="flex items-center justify-between sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    ATM ID <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    Searchable
                  </span>
                </div>
                <div className="relative flex-1 flex items-center px-3 py-1.5">
                  <Search size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={atmId}
                    onChange={(e) => {
                      setAtmId(e.target.value)
                      setShowAtmDropdown(true)
                    }}
                    onFocus={() => setShowAtmDropdown(true)}
                    placeholder="Search ATM ID"
                    className="w-full text-[13px] text-[#1E293B] font-semibold focus:outline-hidden"
                  />
                  {atmId && (
                    <button
                      type="button"
                      onClick={() => setAtmId('')}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {showAtmDropdown && filteredAtms.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {filteredAtms.map((atm) => (
                        <button
                          key={atm.atmId}
                          type="button"
                          onClick={() => {
                            setAtmId(atm.atmId)
                            setShowAtmDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-[12.5px] font-medium text-slate-700 hover:bg-blue-50 hover:text-[#0066FF] cursor-pointer"
                        >
                          <span className="font-semibold">{atm.atmId}</span> — {atm.siteId}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Number * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    Card Number <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <CreditCard size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="e.g. 6082********2486"
                    className="w-full text-[13px] text-[#1E293B] font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* RRN Number * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    RRN Number <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <FileText size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={rrnNumber}
                    onChange={(e) => setRrnNumber(e.target.value)}
                    placeholder="e.g. 626915392411"
                    className="w-full text-[13px] text-[#1E293B] font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Txn Amt (₹) * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    Txn Amt (₹) <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <IndianRupee size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={txnAmt}
                    onChange={(e) => setTxnAmt(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full text-[13px] font-bold text-[#1E293B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Dispute Amt (₹) * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    Dispute Amt (₹) <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <IndianRupee size={15} className="text-red-600 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={disputeAmt}
                    onChange={(e) => setDisputeAmt(e.target.value)}
                    placeholder="e.g. 400"
                    className="w-full text-[13px] font-bold text-red-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* MSP reference No */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">MSP reference No</span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <FileText size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={mspReferenceNo}
                    onChange={(e) => setMspReferenceNo(e.target.value)}
                    placeholder="e.g. 4192"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Adj Amount (₹) */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">Adj Amount (₹)</span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <IndianRupee size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={adjustedAmt}
                    onChange={(e) => setAdjustedAmt(e.target.value)}
                    placeholder="e.g. 0"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Send Status * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    Send Status <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <Send size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <select
                    value={sendStatus}
                    onChange={(e) => setSendStatus(e.target.value)}
                    className="w-full text-[13px] font-semibold text-[#1E293B] bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    <option value="Send">Send</option>
                    <option value="DONE">DONE</option>
                    <option value="Pending">Pending</option>
                  </select>
                  <ChevronDown size={14} className="text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ----------------- RIGHT COLUMN ----------------- */}
            <div className="space-y-3">
              {/* Nature of Incident * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    Nature of Incident <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5 gap-2">
                  <FileText size={15} className="text-[#0066FF] mr-1 shrink-0" />
                  <select
                    value={natureOfIncident}
                    onChange={(e) => setNatureOfIncident(e.target.value)}
                    className="w-full text-[13px] font-medium text-[#1E293B] bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    {natureOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOptionModal('nature')
                      setNewOptionValue('')
                    }}
                    className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1 text-[11px] font-semibold text-[#0066FF] hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus size={12} /> Add Option
                  </button>
                </div>
              </div>

              {/* Error Description * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    Error Description <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5 gap-2">
                  <FileText size={15} className="text-[#0066FF] mr-1 shrink-0" />
                  <select
                    value={errorDescription}
                    onChange={(e) => setErrorDescription(e.target.value)}
                    className="w-full text-[13px] font-medium text-[#1E293B] bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    {errorOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOptionModal('error')
                      setNewOptionValue('')
                    }}
                    className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1 text-[11px] font-semibold text-[#0066FF] hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus size={12} /> Add Option
                  </button>
                </div>
              </div>

              {/* TXN DATE * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    TXN DATE <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <Calendar size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden font-medium"
                  />
                  <Calendar size={15} className="text-slate-400 shrink-0" />
                </div>
              </div>

              {/* TXN TIME * */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                    TXN TIME <span className="text-red-500">*</span>
                  </span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <Clock size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={txnTime}
                    onChange={(e) => setTxnTime(e.target.value)}
                    placeholder="HH:MM:SS"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden font-medium"
                  />
                  <Clock size={15} className="text-slate-400 shrink-0" />
                </div>
              </div>

              {/* WLAO Remark */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">WLAO Remark</span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <FileText size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={wlaoRemark}
                    onChange={(e) => setWlaoRemark(e.target.value)}
                    placeholder="Enter WLAO Remark"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Hitachi Email Date */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">Hitachi Email Date</span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <Calendar size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={hitachiEmailDate}
                    onChange={(e) => setHitachiEmailDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden font-medium"
                  />
                  <Calendar size={15} className="text-slate-400 shrink-0" />
                </div>
              </div>

              {/* Email Response Date */}
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                  <span className="text-[12.5px] font-semibold text-[#8C4A28]">Email Response Date</span>
                </div>
                <div className="flex-1 flex items-center px-3 py-1.5">
                  <Calendar size={15} className="text-[#0066FF] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={emailResponseDate}
                    onChange={(e) => setEmailResponseDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full text-[13px] text-[#1E293B] focus:outline-hidden font-medium"
                  />
                  <Calendar size={15} className="text-slate-400 shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Row 1: Upload Documents */}
          <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
            <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
              <span className="text-[12.5px] font-semibold text-[#8C4A28]">Upload Documents</span>
            </div>
            <div className="flex-1 flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="flex items-center gap-2">
                <Paperclip size={15} className="text-[#0066FF] shrink-0" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-[#CBD5E1] bg-slate-50 px-3 py-1.5 text-[12.5px] font-semibold text-[#1E293B] hover:bg-slate-100 cursor-pointer shadow-xs"
                >
                  Choose Files
                </button>
                <span className="text-[12.5px] text-slate-500">
                  {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) chosen` : 'No file chosen'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDocModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-[12px] font-bold text-[#0066FF] hover:bg-blue-100 cursor-pointer"
              >
                <FileText size={13} /> List Of Uploaded Documents ({uploadedFiles.length})
              </button>
            </div>
          </div>

          {/* Full Width Row 2: FR Remark */}
          <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
            <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
              <span className="text-[12.5px] font-semibold text-[#8C4A28]">FR Remark</span>
            </div>
            <div className="flex-1 flex items-center px-3 py-1.5">
              <FileText size={15} className="text-[#0066FF] mr-2 shrink-0" />
              <input
                type="text"
                value={frRemark}
                onChange={(e) => setFrRemark(e.target.value)}
                placeholder="FR Confirm No Overage Found."
                className="w-full text-[13px] text-[#1E293B] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Full Width Row 3: Remarks */}
          <div className="flex flex-col sm:flex-row rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
            <div className="sm:w-[155px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
              <span className="text-[12.5px] font-semibold text-[#8C4A28]">Remarks</span>
            </div>
            <div className="flex-1 p-2 relative">
              <div className="flex items-start gap-2">
                <FileText size={15} className="text-[#0066FF] mt-1 shrink-0" />
                <textarea
                  rows={2}
                  maxLength={500}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks (if any)"
                  className="w-full text-[13px] text-[#1E293B] resize-none focus:outline-hidden"
                />
              </div>
              <div className="text-right text-[11px] text-slate-400 mt-1">
                {remarks.length}/500
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SELF FUNDING (SF) FORM (Matching Image 4)                */}
      {/* ============================================================== */}
      {activeTab === 'SF' && (
        <div className="space-y-4">
          {/* Card 1: Dispute Details */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066FF] text-white">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">Dispute Details</h3>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-3">
                {/* ATM ID * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="flex items-center justify-between sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      ATM ID <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      Searchable
                    </span>
                  </div>
                  <div className="relative flex-1 flex items-center px-3 py-1.5">
                    <Search size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={atmId}
                      onChange={(e) => {
                        setAtmId(e.target.value)
                        setShowAtmDropdown(true)
                      }}
                      onFocus={() => setShowAtmDropdown(true)}
                      placeholder="Search ATM ID"
                      className="w-full text-[13px] text-[#1E293B] font-semibold focus:outline-hidden"
                    />
                    {atmId && (
                      <button
                        type="button"
                        onClick={() => setAtmId('')}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {showAtmDropdown && filteredAtms.length > 0 && (
                      <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        {filteredAtms.map((atm) => (
                          <button
                            key={atm.atmId}
                            type="button"
                            onClick={() => {
                              setAtmId(atm.atmId)
                              setShowAtmDropdown(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-[12.5px] font-medium text-slate-700 hover:bg-blue-50 hover:text-[#0066FF] cursor-pointer"
                          >
                            <span className="font-semibold">{atm.atmId}</span> — {atm.siteId}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RRN Number * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      RRN Number <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <FileText size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={rrnNumber}
                      onChange={(e) => setRrnNumber(e.target.value)}
                      placeholder="e.g. 6.29118E+11"
                      className="w-full text-[13px] text-[#1E293B] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* TXN Amount (₹) * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      TXN Amount (₹) <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <IndianRupee size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={txnAmt}
                      onChange={(e) => setTxnAmt(e.target.value)}
                      placeholder="e.g. 800"
                      className="w-full text-[13px] font-bold text-[#1E293B] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Adjusted Amount (₹) * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      Adjusted Amount (₹) <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <IndianRupee size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={adjustedAmt}
                      onChange={(e) => setAdjustedAmt(e.target.value)}
                      placeholder="e.g. 0"
                      className="w-full text-[13px] text-[#1E293B] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Dispute Amount (₹) * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      Dispute Amount (₹) <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <IndianRupee size={15} className="text-red-600 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={disputeAmt}
                      onChange={(e) => setDisputeAmt(e.target.value)}
                      placeholder="e.g. 800"
                      className="w-full text-[13px] font-bold text-red-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Send Status * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      Send Status <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <Send size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <select
                      value={sendStatus}
                      onChange={(e) => setSendStatus(e.target.value)}
                      className="w-full text-[13px] font-semibold text-[#1E293B] bg-transparent focus:outline-hidden cursor-pointer"
                    >
                      <option value="DONE">DONE</option>
                      <option value="Send">Send</option>
                      <option value="Pending">Pending</option>
                    </select>
                    <ChevronDown size={14} className="text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* Card No * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      Card No <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <CreditCard size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="e.g. 817509******6868"
                      className="w-full text-[13px] text-[#1E293B] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* TXN DATE * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      TXN DATE <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <Calendar size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={txnDate}
                      onChange={(e) => setTxnDate(e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="w-full text-[13px] text-[#1E293B] focus:outline-hidden font-medium"
                    />
                    <Calendar size={15} className="text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* TXN TIME * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      TXN TIME <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <Clock size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={txnTime}
                      onChange={(e) => setTxnTime(e.target.value)}
                      placeholder="HH:MM:SS"
                      className="w-full text-[13px] text-[#1E293B] focus:outline-hidden font-medium"
                    />
                    <Clock size={15} className="text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* Error Description * */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">
                      Error Description <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5 gap-2">
                    <FileText size={15} className="text-[#0066FF] mr-1 shrink-0" />
                    <select
                      value={errorDescription}
                      onChange={(e) => setErrorDescription(e.target.value)}
                      className="w-full text-[13px] font-medium text-[#1E293B] bg-transparent focus:outline-hidden cursor-pointer"
                    >
                      {errorOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddOptionModal('error')
                        setNewOptionValue('')
                      }}
                      className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1 text-[11px] font-semibold text-[#0066FF] hover:bg-blue-100 cursor-pointer"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>

                {/* MSP Reference No */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">MSP Reference No</span>
                  </div>
                  <div className="flex-1 flex items-center px-3 py-1.5">
                    <FileText size={15} className="text-[#0066FF] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={mspReferenceNo}
                      onChange={(e) => setMspReferenceNo(e.target.value)}
                      placeholder="e.g. 4192"
                      className="w-full text-[13px] text-[#1E293B] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Upload Documents */}
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-[#FED7AA] overflow-hidden bg-white">
                  <div className="sm:w-[160px] shrink-0 bg-[#FFF5EB] px-3.5 py-2.5 border-b sm:border-b-0 sm:border-r border-[#FED7AA]">
                    <span className="text-[12.5px] font-semibold text-[#8C4A28]">Upload Documents</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between px-3 py-1.5 gap-2">
                    <div className="flex items-center gap-2">
                      <Paperclip size={15} className="text-[#0066FF] shrink-0" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-[#CBD5E1] bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                      >
                        Choose Files
                      </button>
                      <span className="text-[12px] text-slate-500 truncate max-w-[90px]">
                        {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s)` : 'No file'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDocModal(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-bold text-[#0066FF] hover:bg-blue-100 cursor-pointer shrink-0"
                    >
                      <FileText size={12} /> View Uploaded Documents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Communication & Remarks (Matching Image 4) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066FF] text-white">
                <Mail size={16} />
              </div>
              <h3 className="text-[15px] font-bold text-[#1E293B]">Communication & Remarks</h3>
            </div>

            {/* 4-Item Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* WLAO Remark */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">WLAO Remark</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <FileText size={15} />
                  </span>
                  <input
                    type="text"
                    value={wlaoRemark}
                    onChange={(e) => setWlaoRemark(e.target.value)}
                    placeholder="Done"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Hitachi Email Date */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Hitachi Email Date</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <Calendar size={15} />
                  </span>
                  <input
                    type="text"
                    value={hitachiEmailDate}
                    onChange={(e) => setHitachiEmailDate(e.target.value)}
                    placeholder="03-10-2026"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Email Response Date */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Email Response Date</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <Calendar size={15} />
                  </span>
                  <input
                    type="text"
                    value={emailResponseDate}
                    onChange={(e) => setEmailResponseDate(e.target.value)}
                    placeholder="05-10-2026"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* FR Remark */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">FR Remark</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <FileText size={15} />
                  </span>
                  <input
                    type="text"
                    value={frRemark}
                    onChange={(e) => setFrRemark(e.target.value)}
                    placeholder="FR Confirm No Overage Found."
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Remarks Textarea with 0/500 */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Remarks</label>
              <div className="relative flex items-start rounded-xl border border-[#CBD5E1] bg-white p-2.5 focus-within:border-[#0066FF]">
                <FileText size={15} className="text-[#0066FF] mt-1 mr-2 shrink-0" />
                <textarea
                  rows={2}
                  maxLength={500}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter Remarks (if any)"
                  className="w-full text-[13px] text-[#1E293B] resize-none focus:outline-hidden"
                />
              </div>
              <div className="text-right text-[11px] text-slate-400 mt-1">
                {remarks.length}/500
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM ACTION BAR                                              */}
      {/* ============================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate('/operations/reconciliation/charge-back')}
          className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#334155] shadow-xs hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Apply / Send Email button as specified in Image 2 & 4 */}
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-[13px] font-bold text-[#0066FF] shadow-xs hover:bg-blue-100 cursor-pointer transition-colors"
          >
            <Mail size={15} /> Apply / Send Email
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1E293B] shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <Save size={15} className="text-[#0066FF]" /> Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('Pending')}
            className="flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer transition-colors"
          >
            <Send size={15} /> {existing ? 'Update Dispute' : 'Submit Dispute'}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: VIEW / MANAGE UPLOADED DOCUMENTS                      */}
      {/* ============================================================== */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF] text-white">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1E293B]">Uploaded Documents</h3>
                  <p className="text-[12px] text-[#64748B]">
                    Supporting proofs and statements attached to this dispute.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto divide-y divide-slate-100">
              {uploadedFiles.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-slate-400">
                  No documents uploaded yet.
                </div>
              ) : (
                uploadedFiles.map((fname, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF]">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{fname}</p>
                        <p className="text-[11px] text-slate-400">PDF / Image • Attached to dispute</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toast(`Viewing ${fname}`)}
                        className="p-1.5 text-slate-500 hover:text-[#0066FF] rounded-md hover:bg-blue-50 cursor-pointer"
                        title="Download / View"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                          toast(`Removed ${fname}`)
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-[#0066FF] hover:bg-blue-100 cursor-pointer"
              >
                <Plus size={13} /> Add More Files
              </button>

              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="rounded-xl bg-[#0066FF] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: SYSTEM-GENERATED EMAIL COMPOSER                        */}
      {/* ============================================================== */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF] text-white">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1E293B]">System-Generated Dispute Email</h3>
                  <p className="text-[12px] text-[#64748B]">
                    Generate and dispatch automated dispute notification using standard template.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-[12.5px]">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Template</label>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 font-medium">
                  {activeTab === 'FFM'
                    ? 'Hitachi Full Funding (FFM) Dispute Notification Template v2.4'
                    : 'Self Funding (SF) WLAO Dispute Escalation Template v1.8'}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipients (To / CC)</label>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 font-mono text-[12px]">
                  disputes@hitachi-payments.com, ops-reco@bankops.in
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-slate-800 font-medium">
                  [{activeTab} Chargeback Dispute] ATM: {atmId} | RRN: {rrnNumber} | Amount: ₹{txnAmt} | Error: {errorDescription}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Generated Body Preview</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700 whitespace-pre-line font-mono max-h-40 overflow-y-auto">
                  {`Dear Team,

Please find the Charge Back Dispute details for your review:
• Funding Type: ${activeTab === 'FFM' ? 'Full Funding (FFM)' : 'Self Funding (SF)'}
• ATM ID: ${atmId}
• Card No: ${cardNumber}
• RRN: ${rrnNumber}
• TXN Date & Time: ${txnDate} ${txnTime}
• Disputed Amount: ₹${disputeAmt} (TXN Amount: ₹${txnAmt})
• Nature of Incident: ${natureOfIncident}
• Error Description: ${errorDescription}
• WLAO Remark: ${wlaoRemark}
• FR Remark: ${frRemark}
• Hitachi Email Date: ${hitachiEmailDate}
• Email Response Date: ${emailResponseDate}

Kindly acknowledge and verify the settlement accordingly.

Regards,
Dexter India Operator Operations Team`}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false)
                  toast('System email sent to Hitachi / WLAO Ops successfully!')
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                <Send size={14} /> Send Email Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADD OPTION (Nature of Incident / Error Description)   */}
      {/* ============================================================== */}
      {showAddOptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-[15px] font-bold text-[#1E293B]">
              Add New{' '}
              {showAddOptionModal === 'nature' ? 'Nature of Incident' : 'Error Description'}{' '}
              Option
            </h3>
            <p className="mt-1 text-[12px] text-[#64748B]">
              Type a custom value to add to the dropdown.
            </p>

            <input
              type="text"
              autoFocus
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              placeholder="Enter new option name"
              className="mt-3 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddOptionModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddOption}
                className="rounded-lg bg-[#0066FF] px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Add Option
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

