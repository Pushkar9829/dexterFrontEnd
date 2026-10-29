import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HardDrive,
  Home,
  Landmark,
  MapPin,
  QrCode,
  Save,
  Search,
  Send,
  Settings,
  Upload,
  User,
} from 'lucide-react'
import { useDisputeStore, ATM_LIST, INITIAL_DUMMY_DISPUTES } from '@/data/failedTxnDisputes'
import { toast } from '@/components/ui/Toast'

export default function FailedTxnsDisputeCreate() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { records, addRecord, updateRecord } = useDisputeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existing = id
    ? records.find((r) => r.id === id || r.ticketNumber === id) ||
      INITIAL_DUMMY_DISPUTES.find((r) => r.id === id || r.ticketNumber === id)
    : undefined

  // ATM & Transaction Details
  const [atmId, setAtmId] = useState(existing?.atmId || '')
  const [siteId, setSiteId] = useState(existing?.siteId || '')
  const [machineType, setMachineType] = useState(existing?.machineType || '')
  const [txnType, setTxnType] = useState(existing?.txnType || '')
  const [txnId, setTxnId] = useState(existing?.txnId || '')
  const [utr, setUtr] = useState(existing?.utr || '')

  // Date & Time
  const [txnDate, setTxnDate] = useState(existing?.txnDate || '19.10.2026')
  const [txnTime, setTxnTime] = useState(existing?.txnTime || '08:00 PM')

  // Customer Details
  const [customerName, setCustomerName] = useState(existing?.customerName || '')
  const [accountNo, setAccountNo] = useState(existing?.accountNo || '')
  const [bankName, setBankName] = useState(existing?.bankName || '')
  const [ifscCode, setIfscCode] = useState(existing?.ifscCode || '')
  const [cardDetails, setCardDetails] = useState(existing?.cardDetails || '')
  const [branch, setBranch] = useState(existing?.branch || '')
  const [rrn, setRrn] = useState(existing?.rrn || '')
  const [amount, setAmount] = useState(existing?.amount || '')
  const [txnSlipFile, setTxnSlipFile] = useState<File | null>(null)
  const [existingSlipName, setExistingSlipName] = useState<string | undefined>(existing?.txnSlipName)

  // Remarks
  const [remarks, setRemarks] = useState(existing?.remarks || '')

  useEffect(() => {
    if (existing) {
      setAtmId(existing.atmId)
      setSiteId(existing.siteId)
      setMachineType(existing.machineType)
      setTxnType(existing.txnType)
      setTxnId(existing.txnId)
      setUtr(existing.utr)
      setTxnDate(existing.txnDate)
      setTxnTime(existing.txnTime)
      setCustomerName(existing.customerName)
      setAccountNo(existing.accountNo)
      setBankName(existing.bankName)
      setIfscCode(existing.ifscCode)
      setCardDetails(existing.cardDetails)
      setBranch(existing.branch)
      setRrn(existing.rrn)
      setAmount(existing.amount)
      setExistingSlipName(existing.txnSlipName)
      setRemarks(existing.remarks)
    }
  }, [existing])

  // Auto-fetch site ID when ATM ID is chosen
  const handleAtmChange = (selected: string) => {
    setAtmId(selected)
    const match = ATM_LIST.find((a) => a.atmId === selected)
    if (match) {
      setSiteId(match.siteId)
    } else {
      setSiteId('')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTxnSlipFile(file)
      setExistingSlipName(file.name)
      toast(`Selected ${file.name}`)
    }
  }

  const handleSave = (isDraft = false) => {
    if (!isDraft) {
      if (!atmId) {
        toast('Please select an ATM ID')
        return
      }
      if (!machineType) {
        toast('Please select Machine Type')
        return
      }
      if (!txnType) {
        toast('Please select TXN Type')
        return
      }
      if (!txnId) {
        toast('Please enter TXN ID')
        return
      }
      if (!customerName) {
        toast('Please enter Customer Name')
        return
      }
      if (!amount) {
        toast('Please enter Amount')
        return
      }
    }

    if (id && existing) {
      updateRecord(existing.id, {
        atmId: atmId || 'ATM-100234',
        siteId: siteId || 'ST-MH-PUN-00124',
        machineType: machineType || 'ATM',
        txnType: txnType || 'Withdrawal - UPI',
        txnId: txnId || existing.txnId,
        utr,
        txnDate: txnDate || '19.10.2026',
        txnTime: txnTime || '08:00 PM',
        customerName: customerName || existing.customerName,
        accountNo,
        bankName,
        ifscCode,
        cardDetails,
        branch,
        rrn,
        amount: amount || '0',
        txnSlipName: txnSlipFile ? txnSlipFile.name : existingSlipName,
        remarks,
        status: isDraft ? 'Draft' : existing.status === 'Draft' ? 'Pending' : existing.status,
      })
      toast('Dispute record updated successfully', 'success')
    } else {
      addRecord({
        atmId: atmId || 'ATM-100234',
        siteId: siteId || 'ST-MH-PUN-00124',
        machineType: machineType || 'ATM',
        txnType: txnType || 'Withdrawal - UPI',
        txnId: txnId || `TXN${Date.now()}`,
        utr,
        txnDate: txnDate || '19.10.2026',
        txnTime: txnTime || '08:00 PM',
        customerName: customerName || (isDraft ? 'Draft Customer' : 'Customer'),
        accountNo,
        bankName,
        ifscCode,
        cardDetails,
        branch,
        rrn,
        amount: amount || '0',
        txnSlipName: txnSlipFile ? txnSlipFile.name : undefined,
        remarks,
        status: isDraft ? 'Draft' : 'Pending',
      })
      toast(
        isDraft ? 'Dispute draft saved successfully' : 'Dispute complaint registered successfully',
        'success'
      )
    }

    navigate('/operations/reconciliation/failed-txns')
  }

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 pb-12 font-sans space-y-4">
      {/* Breadcrumb matching Page 02 */}
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
        <Link to="/operations/reconciliation/failed-txns" className="hover:text-[#0066FF] transition-colors">
          Dispute / Failed TXN
        </Link>
        <ChevronRight size={12} className="text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800">
          Transaction Failed / Dispute Complaint Registration
        </span>
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-xs">
          <FileText size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-[26px]">
              Transaction Failed / Dispute Complaint Registration
            </h1>
            {existing && (
              <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[12px] font-semibold text-[#0066FF]">
                {existing.ticketNumber}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Register customer complaints for failed transactions and disputes.
          </p>
        </div>
      </div>

      {/* Main Form: 2 Column Grid on Desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: ATM & Transaction Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-center gap-2 mb-4 border-b border-[#F1F5F9] pb-3">
              <Landmark size={18} className="text-[#0066FF]" />
              <h3 className="text-[15px] font-bold text-[#1E293B]">ATM & Transaction Details</h3>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* ATM ID */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  ATM ID <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <Search size={15} />
                  </span>
                  <select
                    value={atmId}
                    onChange={(e) => handleAtmChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  >
                    <option value="">Search ATM ID</option>
                    {ATM_LIST.map((atm) => (
                      <option key={atm.atmId} value={atm.atmId}>
                        {atm.atmId}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
                </div>
              </div>

              {/* Site ID */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">Site ID</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <MapPin size={15} />
                  </span>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto Fetch"
                    value={siteId}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-[13px] text-[#64748B] placeholder:text-[#94A3B8] focus:outline-hidden cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Machine Type */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Machine Type <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <HardDrive size={15} />
                  </span>
                  <select
                    value={machineType}
                    onChange={(e) => setMachineType(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  >
                    <option value="">Select Machine Type</option>
                    <option value="CRM">CRM</option>
                    <option value="ATM">ATM</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
                </div>
              </div>

              {/* TXN Type */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  TXN Type <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <Settings size={15} />
                  </span>
                  <select
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  >
                    <option value="">Select TXN Type</option>
                    <option value="Deposit - UPI">Deposit - UPI</option>
                    <option value="Deposit - Card">Deposit - Card</option>
                    <option value="Withdrawal - UPI">Withdrawal - UPI</option>
                    <option value="Withdrawal - Card">Withdrawal - Card</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
                </div>
              </div>

              {/* TXN ID */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  TXN ID <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <CreditCard size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter TXN ID"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  />
                </div>
              </div>

              {/* UTR */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">UTR</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <FileText size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter UTR (If available)"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Date & Time + Customer Details */}
        <div className="space-y-4">
          {/* Card: Date & Time */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3 border-b border-[#F1F5F9] pb-2.5">
              <Calendar size={18} className="text-[#0066FF]" />
              <h3 className="text-[15px] font-bold text-[#1E293B]">Date & Time</h3>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                TXN Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* Date */}
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <Calendar size={15} />
                  </span>
                  <input
                    type="text"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    placeholder="19.10.2026"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-9 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  />
                  <Calendar size={14} className="pointer-events-none absolute right-3 text-[#0066FF]" />
                </div>

                {/* Time */}
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                    <Clock size={15} />
                  </span>
                  <input
                    type="text"
                    value={txnTime}
                    onChange={(e) => setTxnTime(e.target.value)}
                    placeholder="08:00 PM"
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-8 text-[13px] text-[#1E293B] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                  />
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#94A3B8]" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Customer Details */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3.5 border-b border-[#F1F5F9] pb-2.5">
              <User size={18} className="text-[#0066FF]" />
              <h3 className="text-[15px] font-bold text-[#1E293B]">Customer Details</h3>
            </div>

            <div className="space-y-3">
              {/* Row 1: Name & Account No */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    Account No
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <CreditCard size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter Account No"
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Bank Name & IFSC Code */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    Bank Name
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <Landmark size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter Bank Name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    IFSC Code
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <QrCode size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter IFSC Code"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Card Details & Branch */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    Card Details
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <CreditCard size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter Card Details (Last 4 Digits)"
                      value={cardDetails}
                      onChange={(e) => setCardDetails(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    Branch
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <Building2 size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter Branch Name"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: RRN & Amount */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">RRN</label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 text-[#0066FF]">
                      <FileText size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter RRN"
                      value={rrn}
                      onChange={(e) => setRrn(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 font-semibold text-[#0066FF]">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="Enter Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: TXN Slip Upload */}
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  TXN Slip
                </label>
                <div className="flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[13px]">
                  <div className="flex items-center gap-2 text-[#0066FF] min-w-0">
                    <Upload size={16} className="shrink-0" />
                    <span className="font-medium text-[#1E293B] shrink-0 text-[12px]">
                      Upload TXN Slip
                    </span>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="ml-2 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-slate-200 cursor-pointer"
                    >
                      Choose File
                    </button>

                    <span className="truncate text-[11.5px] text-[#64748B]">
                      {txnSlipFile ? txnSlipFile.name : existingSlipName || 'No file chosen'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#64748B] hover:text-[#0066FF] p-1 cursor-pointer"
                    title="Upload file"
                  >
                    <Upload size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Card: Remarks */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={17} className="text-[#0066FF]" />
          <h3 className="text-[14px] font-bold text-[#1E293B]">Remarks</h3>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Enter remarks (if any)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full resize-none rounded-xl border border-[#CBD5E1] bg-white p-3 pb-7 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0066FF] focus:outline-hidden focus:ring-1 focus:ring-[#0066FF]"
          />
          <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] font-medium text-[#94A3B8]">
            {remarks.length}/500
          </span>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        {/* Back Button */}
        <Link
          to="/operations/reconciliation/failed-txns"
          className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1E293B] shadow-xs transition-colors hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1E293B] shadow-xs transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <Save size={16} className="text-[#0066FF]" /> Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <Send size={15} /> {existing ? 'Update Complaint' : 'Submit Complaint'}
          </button>
        </div>
      </div>
    </div>
  )
}
